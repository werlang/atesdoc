# SUAP-Teacher-Scraper
Projeto em Node.js que automatiza a extração de dados acadêmicos do sistema SUAP (Sistema Unificado de Administração Pública) para professores do IFSul, utilizando Puppeteer para navegação e scraping.

## Descrição
Este script automatiza o login no portal SUAP, acessa os diários de classe de um ou mais professores, para vários períodos letivos, e extrai informações detalhadas sobre disciplinas, turmas, carga horária cumprida e registros de aulas. O objetivo é gerar relatórios consolidados da carga de aulas ministradas por semestre, facilitando o acompanhamento e análise do trabalho docente.

## Funcionalidades Principais
- Login automatizado no SUAP com Puppeteer (modo headless)
- Navegação e extração dos links dos diários de classe para vários períodos letivos configuráveis
- Coleta detalhada das informações dos diários: componente curricular, turma, curso, número de matriculados, carga horária cumprida
- Extração dos registros de aulas com datas e quantidades
- Cálculo da carga horária semanal, semestral e total de acordo com regras específicas
- Consolidação e impressão de relatórios detalhados por semestre e curso, com média de cargas horárias

## Arquivo principal
O arquivo principal da aplicação é `app.js`.

## Scripts disponíveis
- `npm test` — Executa o script de teste (ainda não configurado, exibe erro).

## Dependências
Este projeto utiliza as seguintes dependências:

- [colors](https://www.npmjs.com/package/colors) — para estilização de texto no terminal.
- [lodash](https://lodash.com/) — biblioteca utilitária para manipulação de arrays, objetos, etc.
- [moment](https://momentjs.com/) — para manipulação e formatação de datas.
- [puppeteer](https://pptr.dev/) — para automação de navegação web.
- [underscore](https://underscorejs.org/) — biblioteca utilitária similar ao lodash.

## Instalação
Para instalar as dependências, execute:

```bash
npm install
```

## Uso
Para iniciar a aplicação, execute:

```bash
node app.js
```

## Avisos
- Projetado para uso institucional do IFSul e professores com acesso ao SUAP.
- Certifique-se de que suas credenciais estão corretas e que o acesso ao SUAP não utiliza autenticação extra (como captcha ou 2FA).
- O script pode precisar de ajustes caso o layout do SUAP seja alterado.
