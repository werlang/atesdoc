# 🎓 Gerador de Atestado de Docência - IFSUL

Uma interface web moderna e intuitiva para gerar atestados de docência do Instituto Federal Sul-Rio-Grandense, Campus Charqueadas.

## ✨ Características

- **Interface Material Design**: Design moderno e responsivo inspirado no Material Design
- **Processo Guiado**: Interface de 3 etapas para facilitar a configuração
- **Seleção Flexível**: Escolha semestres e disciplinas específicas
- **Exclusões Personalizadas**: Configure disciplinas para exclusão
- **Geração Automática**: Integração completa com o scraper SUAP existente
- **Download Direto**: Baixe o atestado gerado diretamente da interface

## 🚀 Como Usar

### Pré-requisitos

1. **Google Chrome** rodando em modo debug:
   ```bash
   # No macOS
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

   # No Windows
   chrome.exe --remote-debugging-port=9222

   # No Linux
   google-chrome --remote-debugging-port=9222
   ```

2. **Credenciais SUAP** configuradas:
   ```bash
   export SUAP_USERNAME="seu_usuario"
   export SUAP_PASSWORD="sua_senha"
   ```

### Instalação

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Inicie o servidor web:
   ```bash
   npm run web
   ```

3. Acesse a interface em: `http://localhost:3000`

### Uso da Interface

#### Passo 1: Dados do Professor
- Insira o **ID do professor** (obrigatório)
- Opcionalmente, preencha nome e SIAPE (serão obtidos automaticamente do SUAP)

#### Passo 2: Configuração
- **Selecione os semestres** clicando nos cards
- **Adicione semestres personalizados** se necessário
- **Configure exclusões** de disciplinas específicas

#### Passo 3: Revisão
- Verifique todas as configurações
- Clique em **"Gerar Atestado"** para processar

#### Geração e Download
- Acompanhe o progresso em tempo real
- Faça o download do atestado gerado

## 🏗️ Arquitetura

### Frontend
- **HTML5 Semântico** com acessibilidade
- **CSS3 Moderno** com variáveis CSS e Grid/Flexbox
- **JavaScript ES6+** com classes e módulos
- **Material Design Icons** para iconografia

### Backend
- **Express.js** para servidor web
- **API REST** para comunicação
- **Integração** com scraper Puppeteer existente
- **Gerenciamento de processos** para operações longas

### Estrutura de Arquivos
```
├── public/                 # Frontend estático
│   ├── index.html         # Página principal
│   ├── css/
│   │   └── styles.css     # Estilos Material Design
│   └── js/
│       └── app.js         # Aplicação JavaScript
├── server.js              # Servidor Express
├── app.js                 # Scraper original (modificado)
├── config.js              # Configuração padrão
├── document-builder.js    # Gerador de documentos
└── template/              # Templates HTML
```

## 🎨 Design System

### Cores Principais
- **Primary**: #1976d2 (Azul Material)
- **Secondary**: #424242 (Cinza escuro)
- **Success**: #4caf50 (Verde)
- **Error**: #f44336 (Vermelho)
- **Warning**: #ff9800 (Laranja)

### Tipografia
- **Família**: Roboto, system fonts
- **Tamanhos**: 12px a 32px escala harmônica
- **Pesos**: 300 (Light), 400 (Regular), 500 (Medium), 700 (Bold)

### Espaçamento
- **Escala**: 4px, 8px, 16px, 24px, 32px
- **Grid**: Baseado em múltiplos de 8px

## 🔧 API Endpoints

### POST `/api/generate-attestation`
Gera um atestado de docência.

**Payload:**
```json
{
  "professores": [{
    "id": 1641,
    "semestres": ["2023.2", "2024.1"],
    "exclude": ["Nome da disciplina a excluir"]
  }]
}
```

**Resposta:**
```json
{
  "success": true,
  "filename": "1641.html",
  "message": "Atestado gerado com sucesso"
}
```

### GET `/api/download/:filename`
Faz download do atestado gerado.

### GET `/api/health`
Verifica o status do sistema e dependências.

### GET `/api/status`
Retorna informações sobre processos ativos.

## 🛠️ Desenvolvimento

### Scripts Disponíveis
```bash
npm run server    # Inicia servidor de produção
npm run dev       # Inicia servidor com nodemon
npm run web       # Alias para npm run server
npm start         # Executa scraper original
```

### Debugging
- **Frontend**: Use DevTools do navegador
- **Backend**: Logs detalhados no console
- **Scraper**: Output completo do processo

### Extensões Futuras
- [ ] Modo escuro
- [ ] PWA (Progressive Web App)
- [ ] Autenticação de usuários
- [ ] Histórico de atestados
- [ ] Templates personalizáveis
- [ ] Exportação PDF
- [ ] API de integração

## 🔒 Segurança

- **Validação** de entrada rigorosa
- **Timeout** para processos longos
- **Limpeza** de arquivos temporários
- **Sanitização** de dados do usuário

## 📱 Responsividade

A interface é totalmente responsiva e funciona bem em:
- **Desktop** (1200px+)
- **Tablet** (768px - 1199px)
- **Mobile** (320px - 767px)

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença ISC. Veja o arquivo `LICENSE` para detalhes.

## 👥 Autores

- **Felipe Thomas** - Desenvolvimento inicial do scraper
- **GitHub Copilot** - Interface web e melhorias

## 🆘 Suporte

Para problemas ou dúvidas:
1. Verifique a seção de troubleshooting
2. Consulte os logs do servidor
3. Abra uma issue no repositório
