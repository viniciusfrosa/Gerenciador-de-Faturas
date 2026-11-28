# Gerenciador de Faturas

Aplicação web progressiva (PWA) para acompanhar faturas compartilhadas, compras parceladas, pagamentos, gastos do titular e compras recorrentes.

## Funcionalidades

- Cadastro de devedores e despesas individuais/conjuntas.
- Parcelamento, pagamentos e antecipação com desconto.
- Gastos do titular separados por fatura.
- Categorias de gastos e filtro por pessoa/categoria.
- Recorrências mensais, semanais ou anuais, com período opcional.
- Exportação de fatura como imagem.
- Backup e restauração JSON.
- Instalação como PWA e suporte offline.

## Usar online

https://viniciusfrosa.github.io/Gerenciador-de-Faturas/

## Executar localmente

Requer Python 3 para servir os arquivos estáticos:

```bash
git clone https://github.com/viniciusfrosa/Gerenciador-de-Faturas.git
cd Gerenciador-de-Faturas
python3 -m http.server 8080
```

Acesse `http://localhost:8080`.

## Dados e recorrências

As informações ficam no armazenamento local do navegador (`localStorage`); não são enviadas a um servidor. Faça backups em **Configurações > Backup & Restauração** antes de limpar os dados do navegador ou trocar de dispositivo.

As recorrências são locais ao navegador/dispositivo. Ao abrir o app, os lançamentos vencidos são gerados uma única vez para cada ocorrência. Para transferi-las, inclua o armazenamento local nas suas rotinas de backup ou recrie as recorrências no outro aparelho.

## Testes

Com Node.js 18 ou superior:

```bash
npm test
```

## Licença

MIT. Consulte [LICENSE](LICENSE).
