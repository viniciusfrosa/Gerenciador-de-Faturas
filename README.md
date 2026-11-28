# Gerenciador de Faturas

Aplicação web progressiva (PWA) para gerenciar faturas compartilhadas, compras parceladas, pagamentos e gastos pessoais do titular.

## Funcionalidades

- Cadastro e edição de devedores.
- Registro de compras individuais e compras conjuntas.
- Parcelamento de compras com cálculo mensal.
- Registro e edição de pagamentos.
- Antecipação de parcelas com desconto.
- Separação dos gastos pessoais do titular.
- Filtros mensais por fatura.
- Exportação da fatura como imagem.
- Backup e restauração dos dados em formato JSON.
- Funcionamento como PWA instalada no celular ou computador.

## Uso online

https://viniciusfrosa.github.io/Gerenciador-de-Faturas/

## Executar localmente

Não é necessário instalar dependências ou executar um servidor de compilação.

1. Clone o repositório:

```bash
git clone https://github.com/viniciusfrosa/Gerenciador-de-Faturas.git
cd Gerenciador-de-Faturas
```

2. Inicie um servidor estático:

```bash
python3 -m http.server 8080
```

3. Abra `http://localhost:8080` no navegador.

## Armazenamento dos dados

Todos os dados são armazenados no `localStorage` do navegador. Eles não são enviados para um servidor.

Para preservar ou transferir os dados:

1. Abra **Configurações**.
2. Escolha **Baixar Backup**.
3. Guarde o arquivo JSON.
4. Em outro aparelho ou após limpar o navegador, use **Restaurar**.

A limpeza dos dados do navegador remove permanentemente as informações locais que não possuam backup.

## Tecnologias

- HTML
- CSS com Tailwind CDN
- JavaScript
- Service Worker
- Web Manifest
- Lucide Icons
- html2canvas

## Licença

Este projeto está licenciado sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE).
