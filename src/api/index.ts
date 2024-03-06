import { CloudflareWorkersAIEmbeddings, CloudflareVectorizeStore } from "@langchain/cloudflare";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Bindings, createHonoApp } from "../honoApp";
import { Document } from "langchain/document";
import { loadSessions } from "../contents/sessions";
import { loadPosts } from "../contents/posts";
import { loadPages } from "../contents/pages";

/**
 * Create / update Vectorize index data
 */
export const indexApp = createHonoApp()

const initModels = (bindings: Bindings, indexName: keyof Pick<Bindings, 'VECTORIZE_GENERAL_INDEX' | 'VECTORIZE_SESSIONS_INDEX'> = 'VECTORIZE_GENERAL_INDEX') => {
    const embeddings = new OpenAIEmbeddings({
        openAIApiKey: bindings.OPENAI_API_KEY,
      });
    const vectorStore = new CloudflareVectorizeStore(embeddings, {
      index: bindings[indexName]
    });

    return {
        embeddings,
        vectorStore
    }
}

indexApp.get('/', async c => {
    return c.json(await loadSessions())
})

type WPPost = {
    title: {
        rendered: string;
    };
    content: {
        rendered: string;
    };
    excerpt: {
        rendered: string;
    }
    id: number;
    link: string;
}


indexApp.get('/sessions', async c => {
    const sessions = await loadSessions()
    const sessionsDocuments: Array<Document> = []
    const sessiontIndexes: string[] = []
    const splitter = RecursiveCharacterTextSplitter.fromLanguage('html', {
      chunkSize: 400,
      chunkOverlap: 100,
      keepSeparator: true,
      separators: ['\n', '。']
    });
    for await (const session of sessions) {
        if (session.content.protected) continue
        if (session.meta._wcpt_session_type !== 'session') continue
        const content = session.content.rendered
            .replace(/<[^>]*>/g, '')
            .replace(/\n/g, '')
        const splittedTexts = await splitter.splitText(content)
        const sessionHeaderText = [
            `# ${session.title.rendered}\n`,
            `- Session date time: ${session.session_date_time.date} ${session.session_date_time.time}`,
            `- Session speaker: ${session.session_speakers.map(speaker => speaker.name).join(',')}`,
        ].join('\n')
        const docsMetadata = {
          id: session.id.toString(),
          title: session.title.rendered,
          url: session.link
        }
        splittedTexts.forEach((text, i) => {
            const pageContent =  `${sessionHeaderText}\n- Session Detail-${i + 1}: ${text}`
            const doc = new Document({
                pageContent,
                metadata: docsMetadata
            })
            sessionsDocuments.push(doc)
            sessiontIndexes.push(`${session.id}:${i + 1}`)
        })
    }
    const { vectorStore } = initModels(c.env, 'VECTORIZE_SESSIONS_INDEX')
    await vectorStore.addDocuments(sessionsDocuments, { ids: sessiontIndexes });
    return c.json([`${sessionsDocuments.length} items`])
})


indexApp.get('/posts', async c => {
    try {
        const posts: Array<WPPost> = await loadPosts()         
        const { documentIndexes, documents} = await createIndexDocumentsFromPosts(posts)
        const { vectorStore } = initModels(c.env, 'VECTORIZE_GENERAL_INDEX')
        await vectorStore.addDocuments(documents, { ids: documentIndexes });
        return c.json([`${documents.length} items`])
    } catch (e) {
        console.log(e)
        return c.json(e)
    }
})



indexApp.get('/pages', async c => {
    try {
        const posts: Array<WPPost> = await loadPages()         
        const { documentIndexes, documents} = await createIndexDocumentsFromPosts(posts)
        const { vectorStore } = initModels(c.env, 'VECTORIZE_GENERAL_INDEX')
        await vectorStore.addDocuments(documents, { ids: documentIndexes });
        return c.json([`${documents.length} items`])
    } catch (e) {
        console.log(e)
        return c.json(e)
    }
})
async function createIndexDocumentsFromPosts(posts: WPPost[]):Promise<{
    documents: Document[];
    documentIndexes: string[]
}> {
    const documents: Array<Document> = []
    const documentIndexes: string[] = []
    const splitter = RecursiveCharacterTextSplitter.fromLanguage('html', {
      chunkSize: 300,
      chunkOverlap: 100,
      keepSeparator: true,
      separators: ['\n', '。']
    });
    for await (const post of posts) {
      const text = post.content.rendered.replace(/<[^>]*>/g, '')
      .replace(/\s*\n+\s*/g, ',').replace(/,+/g, ',');
      const title = post.title.rendered.replace(/<[^>]*>/g, '')
      .replace(/\s*\n+\s*/g, ',').replace(/,+/g, ',');
      
      const postHeaderText = `- Title:  ${title}`
      const docsMetadata = {
        id: post.id.toString(),
        title: title,
        url: post.link
      }
      const splittedTexts = await splitter.splitText(text);
      splittedTexts.forEach((text, i) => {
        const pageContent =  `${postHeaderText}\n- Content-${i + 1}: ${text}`
        const doc = new Document({
            pageContent,
            metadata: docsMetadata
        })
        documents.push(doc)
        documentIndexes.push(`${post.id}:${i + 1}`)
      })
    }
    return {
        documents,
        documentIndexes,
    }
}
