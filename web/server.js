const express = require('express');
const path = require('path');
const fs = require('fs');
const { execFile, spawn } = require('child_process');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store active scraping processes
const activeProcesses = new Map();

// API Routes
app.post('/api/generate-attestation', async (req, res) => {
    try {
        const { professores } = req.body;
        
        if (!professores || !Array.isArray(professores) || professores.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Dados do professor são obrigatórios'
            });
        }

        const professor = professores[0];
        
        // Validate required fields
        if (!professor.id) {
            return res.status(400).json({
                success: false,
                error: 'ID do professor é obrigatório'
            });
        }

        if (!professor.semestres || professor.semestres.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Pelo menos um semestre deve ser selecionado'
            });
        }

        // Create temporary config file
        const tempConfigPath = path.join(__dirname, 'temp-config.js');
        const configContent = `module.exports = ${JSON.stringify({ 
            semestres: professor.semestres,
            professores: [professor]
        }, null, 2)};`;
        
        fs.writeFileSync(tempConfigPath, configContent);

        // Execute the scraper
        const processId = Date.now().toString();
        
        const scraperProcess = spawn('node', ['app.js'], {
            env: {
                ...process.env,
                CONFIG_FILE: tempConfigPath
            },
            cwd: __dirname
        });

        activeProcesses.set(processId, scraperProcess);

        let output = '';
        let hasError = false;

        scraperProcess.stdout.on('data', (data) => {
            output += data.toString();
            console.log(`Scraper stdout: ${data}`);
        });

        scraperProcess.stderr.on('data', (data) => {
            output += data.toString();
            console.error(`Scraper stderr: ${data}`);
            hasError = true;
        });

        scraperProcess.on('close', (code) => {
            activeProcesses.delete(processId);
            
            // Clean up temp file
            if (fs.existsSync(tempConfigPath)) {
                fs.unlinkSync(tempConfigPath);
            }

            if (code === 0 && !hasError) {
                const filename = `${professor.id}.html`;
                const documentPath = path.join(__dirname, 'document', filename);
                
                if (fs.existsSync(documentPath)) {
                    res.json({
                        success: true,
                        filename: filename,
                        message: 'Atestado gerado com sucesso'
                    });
                } else {
                    res.status(500).json({
                        success: false,
                        error: 'Arquivo do atestado não foi encontrado'
                    });
                }
            } else {
                res.status(500).json({
                    success: false,
                    error: `Erro no processo de geração. Código: ${code}`,
                    output: output
                });
            }
        });

        scraperProcess.on('error', (error) => {
            activeProcesses.delete(processId);
            console.error('Erro ao iniciar o processo do scraper:', error);
            
            res.status(500).json({
                success: false,
                error: 'Erro ao iniciar o processo de geração'
            });
        });

        // Set timeout for long-running processes
        setTimeout(() => {
            if (activeProcesses.has(processId)) {
                scraperProcess.kill();
                activeProcesses.delete(processId);
                
                res.status(408).json({
                    success: false,
                    error: 'Timeout: O processo demorou muito para ser concluído'
                });
            }
        }, 300000); // 5 minutes timeout

    } catch (error) {
        console.error('Erro na geração do atestado:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

app.get('/api/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'document', filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            success: false,
            error: 'Arquivo não encontrado'
        });
    }

    res.download(filePath, filename, (err) => {
        if (err) {
            console.error('Erro no download:', err);
            res.status(500).json({
                success: false,
                error: 'Erro ao fazer download do arquivo'
            });
        }
    });
});

app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        activeProcesses: activeProcesses.size,
        uptime: process.uptime()
    });
});

// Check scraper dependencies
app.get('/api/health', (req, res) => {
    const checks = {
        nodeModules: fs.existsSync(path.join(__dirname, 'node_modules')),
        appJs: fs.existsSync(path.join(__dirname, 'app.js')),
        configJs: fs.existsSync(path.join(__dirname, 'config.js')),
        documentBuilder: fs.existsSync(path.join(__dirname, 'document-builder.js')),
        templateDir: fs.existsSync(path.join(__dirname, 'template')),
        documentDir: fs.existsSync(path.join(__dirname, 'document'))
    };

    const allChecksPass = Object.values(checks).every(check => check);

    res.json({
        success: allChecksPass,
        checks: checks,
        recommendations: allChecksPass ? [] : [
            'Verifique se todas as dependências estão instaladas',
            'Execute "npm install" se necessário',
            'Certifique-se de que todos os arquivos do scraper estão presentes'
        ]
    });
});

// Serve the main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Rota não encontrada'
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Recebido SIGTERM, encerrando servidor...');
    
    // Kill all active processes
    activeProcesses.forEach((process, id) => {
        console.log(`Encerrando processo ${id}`);
        process.kill();
    });
    
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Recebido SIGINT, encerrando servidor...');
    
    // Kill all active processes
    activeProcesses.forEach((process, id) => {
        console.log(`Encerrando processo ${id}`);
        process.kill();
    });
    
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📁 Arquivos estáticos servidos de: ${path.join(__dirname, 'public')}`);
    console.log(`📄 Documentos gerados em: ${path.join(__dirname, 'document')}`);
});

module.exports = app;
