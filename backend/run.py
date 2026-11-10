"""
Ponto de entrada do E.L.O.

Como rodar (dentro da pasta backend/, com o venv ativado):
    python run.py

Depois abra no navegador: http://localhost:5000
"""
import logging
import os

from app import create_app

app = create_app()

# O servidor de desenvolvimento do Flask (Werkzeug) imprime uma linha por
# requisição, com os arquivos estáticos e a query string (a parte depois
# do "?" na URL). Quem registra as requisições no E.L.O. é o nosso
# middleware (app/middleware.py), que mostra só método, caminho, status e
# tempo. Por isso o registro do Werkzeug fica só para ERROS.
logging.getLogger("werkzeug").setLevel(logging.ERROR)

if __name__ == "__main__":
    # Com o Werkzeug silenciado, a linha "Running on http://..." também some.
    # Então mostramos o endereço aqui. No modo debug o Flask roda este arquivo
    # duas vezes (para reiniciar sozinho); WERKZEUG_RUN_MAIN = "true" marca a
    # segunda vez, e assim o endereço aparece uma vez só.
    if os.environ.get("WERKZEUG_RUN_MAIN") != "true":
        print("E.L.O. rodando em http://localhost:5000  (Ctrl + C para parar)", flush=True)

    # debug vem do .env (FLASK_DEBUG=1): mostra erros detalhados e
    # reinicia o servidor sozinho quando o código muda.
    app.run(debug=app.config["DEBUG"])
