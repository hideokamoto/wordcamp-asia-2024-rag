import { jsxRenderer } from 'hono/jsx-renderer'
import { createHonoApp } from './honoApp'
import { html } from 'hono/html'

export const pageApp = createHonoApp()

pageApp.get(
  '*',
  jsxRenderer(({ children }) => {
    return (
      <html style="font-size: 16px;">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@exampledev/new.css@1.1.2/new.min.css" />
            {html`
          <script>
          document.addEventListener('DOMContentLoaded', function () {
            document.getElementById('input-form').addEventListener('submit', function (event) {
              event.preventDefault()
              const formData = new FormData(event.target)
              const query = formData.get('query')
              fetchChunked(query)
            })
          })
          async function fetchChunked(query) {
            const target = document.getElementById('ai-content')
            const resource = document.getElementById("ai-resources")
            resource.innerHTML = ''
            target.innerHTML = 'loading...'

            const response = await fetch('/api/rag/ask', {
                method: 'POST',
                headers: {
                  'content-type': 'application/json'
                },
                body: JSON.stringify({ query })
            })
            const reader = response.body.getReader()
            let decoder = new TextDecoder()
            reader.read().then(function processText({ done, value }) {
              if (done) {
                return
              }
              if (target.innerHTML === 'loading...') {
                target.innerHTML = ''
              }
              const data = decoder.decode(value)
              const jsonArray = JSON.parse("[" + data.replace(/}{/g, "},{") +"]")

              jsonArray.forEach(data => {
                if (data.answer) {
                  target.innerHTML += data.answer
                } else if (data.sessions) {
                  data.sessions.forEach(session => {
                    resource.innerHTML += '<li><a href="' + session.url + '" target="_blanck" rel="noopener noreferrer">' + session.title + "</a></li>"
                  })
                }      
              })


              return reader.read().then(processText)
            })


          }
          </script>
        `}
        </head>
        <body>
          <header>
            <h1>WordCamp Kansai AI (limited alpha)</h1>
          </header>
          <div>{children}</div>
        </body>
      </html>
    )
  })
)

pageApp.get('/', (c) => {
  return c.render(
    <>
      <section>
        <h2>You</h2>
        <form id="input-form" autocomplete="off" method="post">
          <input
            type="text"
            name="query"
            style={{
              width: '100%'
            }}
          />
          <button type="submit">Send</button>
        </form>
        <h2>AI</h2>
        <pre
          id="ai-content"
          style={{
            'white-space': 'pre-wrap'
          }}
        ></pre>
        <ul id="ai-resources"></ul>
      </section>
      <section>
        <h2>このサイトについて</h2>
        <p>このサイトは、RAG(Retrieval Augmented Generation)の習作として、WordCamp Kansai 2024のセッション情報などを利用して構築したアプリです。</p>
        <p>検索精度が60-70%と高くないため、回答結果については<strong>あくまで参考程度</strong>としてご利用ください。</p>
      </section>
    </>
  )
})

