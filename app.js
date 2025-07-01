const username = process.env.SUAP_USERNAME || 'user';
const password = process.env.SUAP_PASSWORD || 'password';

const puppeteer = require('puppeteer-core');
const moment = require('moment');
const _ = require('lodash');
const colors = require('colors'); //https://www.npmjs.com/package/colors

const professores = [
    {
        nome: "Vanius Zapalowski",
        id: 558
    },
];

// const periodos = [ '2023.2', '2024.1' ];
const periodos = [ '2023.2', '2024.1', '2024.2', '2025.1' ];
let keysSemestres = [];
const cursos = [];

const suapUrl = 'https://suap.ifsul.edu.br/accounts/login/';
const urlProfessor = 'https://suap.ifsul.edu.br/edu/professor/';
const endpointDiarios = '/?tab=disciplinas&ano-periodo=';


(async () => {
    // Remote debug: edge://inspect/#devices
    const browser = await puppeteer.connect({
        browserURL: 'http://docker.for.mac.localhost:9222'
    });
    const page = await browser.newPage();
    const todasDisciplinas = {};
    let totalDiarios = 0;
    page.on('console', consoleObj => console.log(consoleObj.text()));
    await page.setViewport({ width: 1920, height: 2000 });
    //vai para a página de login do SUAP
    console.log(`------------- Acessando o SUAP como ${username} -----------`);
    await page.goto(suapUrl);
    await page.waitForSelector('#id_username');
    await page.$eval('#id_username', function(el, _username) { el.value = _username }, username);
    await page.$eval('#id_password', function(el, _password) { el.value = _password }, password);
    await page.click('input[type="submit"]');

    await page.waitForNavigation();

    await page.waitForSelector('#user-tools');
    console.log("Acesso permitido");
    
    for (const professor of professores) {
        console.log(`PROFESSOR: ${professor.nome}`);
        let diarios = {};
        //para cada período letivo vai acessando os diários e armazena no array os links
        for (const periodoLetivo of periodos) {
            const url = urlProfessor + professor.id + endpointDiarios + periodoLetivo;
            console.log(`ACESSANDO URL ${url}`);
            await page.goto(url);
            const content = await page.content();
            // await page.waitForSelector('#select_ano_periodo');
            
            let links = await page.evaluate(() => {
                let anchors = document.body.querySelectorAll('a');
                return [].map.call(anchors, a => a.href);
            });
            
            let parsed = links.filter( l => l.indexOf('br/edu/diario') > -1);
            const keyPeriodo = periodoLetivo.replace(".", "_");
            diarios[keyPeriodo] = parsed;
            totalDiarios += diarios[keyPeriodo].length;
        }
        console.log(diarios);
        //depois de puxar todos os links dos diarios, começa a iterar um a um para puxar os dados
        
        let cont = 1;
        for (const key in diarios) {
            if (Object.hasOwnProperty.call(diarios, key)) {
                const diariosUrl = diarios[key];
                for (const diarioUrl of diariosUrl) {
                    // if (cont > 8) continue; //Descomentar em ambiente de teste
                    
                    console.log(`Acessando diario ${cont++} de ${totalDiarios} ${diarioUrl}`.cyan);
                    await page.goto(diarioUrl);
                    await page.content();
                    //foi necessario extrair o codigo do diário para montar o link da url registrar_chamada, pois estava 
                    //sempre pegando o primeiro diário, ele mantia o primeiro diário em todas as outras chamadas. :/
                    let cod = diarioUrl.replace("https://suap.ifsul.edu.br/edu/diario/", "").replace("/", "");
                    
                    let links = await page.evaluate(() => {
                        let anchors = document.body.querySelectorAll('a');
                        //por algum motivo estava mantendo o link do primeiro diário no content da página
                        //em todas as consultas.
                        //converte para array
                        return [].map.call(anchors, function(a) {
                            return {"href" : a.href, "innerText" : a.innerText}
                        });
                    });
                    //as divs com conteúdos específicos estão definidas com a classe list-item
                    let divs = await page.evaluate(() => {
                        let listItens = document.body.querySelectorAll('.list-item');
                        return [].map.call(listItens, function(div) {
                            return div.innerText;
                        });
                    });

                    let componente = links.filter( l => l.href.indexOf('br/edu/componente') > -1 );
                    let aulas = links.filter( l => l.href.indexOf(`edu/registrar_chamada/${cod}`) > -1);
                    let curso = links.filter( l => l.href.search(/edu\/cursocampus\/\d/) > -1);
                    let turma = links.filter( l => l.href.search(/edu\/turma\/\d/) > -1);
                    let codigoDiario = divs.filter ( d => d.indexOf("Código") > -1)[0].split("\n")[1];
                    let qtdMatriculados = divs.filter ( d => d.indexOf("Matriculados") > -1)[0].split("\n")[1];

                    //as divs com conteúdos específicos estão definidas com a classe list-item
                    let chCumprida = await page.evaluate(() => {
                        let listItens = document.body.querySelectorAll('.progress');
                        return [].map.call(listItens, function(div) {
                            return div.dataset.progress;
                        });
                    });
                    console.log(chCumprida);
                    if (chCumprida[0] !== undefined) {
                        chCumprida = chCumprida[0]
                            .replace('p', '')
                            .replace('%', '');
    
                        console.log(`CARGA CUMPRIDA: ${chCumprida}`.brightBlue);
                    }
                    
                    let todasAulas = [];
                    //pode ter registro de aulas na primeira e segunda etapa
                    for (let i = 0; i < aulas.length; i++) {
                        console.log(`Acessando registros de ${aulas[i].href}`.yellow);
                        await page.goto(aulas[i].href);
                        await page.content();
                        
                        let todosRegistros = await page.evaluate((nomeProfessor) => {
                            let trAulas = document.body.querySelectorAll('#table_registro_aula tr');
                            let disciplinaDividida = false;
                            let nomeArray = nomeProfessor.split(" ");
                            let primeiroUltimoNome = nomeArray[0] + " " + nomeArray[ nomeArray.length -1 ]; //concatena o primeiro e o ultimo nome do professor
                            let primeiroSegundoNome = nomeArray[0] + " " + nomeArray[ 1 ]; //concatena o primeiro e o segundo nome - Caso do Matheus Senna
                            //a tabela das disciplinas pode ter alguns formatos diferentes, com as posições dos dados no index da coluna sendo dinâmico
                            let offset;
                            //se tiver a coluna professor no header, é disciplina dividida
                            if (trAulas.length > 0) {
                                offset = trAulas[0].cells[1].innerText.toLowerCase().trim() == "quantidade" ? 1 : 0;
                                disciplinaDividida = trAulas[0].cells[4 - offset].innerText == "Professor";
                            }
                            return [].map.call(trAulas, function(tr) {
                                let quantidade = tr.cells[2 - offset].innerText;
                                //nas disciplinas divididas qando o nome do professor não estiver na linha da tabela, zera a qtd de aulas
                                let nomeProfessorSuap = tr.cells[4 - offset].innerText.toLowerCase().trim();
                                if (disciplinaDividida 
                                    && nomeProfessorSuap != nomeProfessor.toLowerCase() 
                                    && nomeProfessorSuap.indexOf(primeiroUltimoNome.toLocaleLowerCase()) == -1 
                                    && nomeProfessorSuap.indexOf(primeiroSegundoNome.toLocaleLowerCase()) == -1 ) 
                                {
                                    quantidade = "0 aulas";
                                }
                                return { "data" : tr.cells[3 - offset].innerText, "quantidade" : quantidade };
                                
                            });
                        }, professor.nome);

                        todasAulas = todasAulas.concat(todosRegistros);
                    }
                    
                    todasDisciplinas[codigoDiario] = {
                        matriculados    : qtdMatriculados,
                        curso           : curso[0].innerText,
                        turma           : turma[0].innerText,
                        componente      : componente[0].innerText,
                        nomeDisciplina  : componente[0].innerText.split(" - ")[1],
                        aulas           : aulas[0],
                        registros       : todasAulas,
                        aulasSemestre   : calculaAulasPorSemestre(todasAulas),
                        url             : diarioUrl,
                        cargaCumprida   : parseInt(chCumprida)
                    }
                    
                    addCurso(todasDisciplinas[codigoDiario].curso);
                    console.log(todasDisciplinas[codigoDiario].componente);
                    console.log(`<SCRAPED ${codigoDiario}>`.white);
                    
                }        
            }
        }  
    } 

    renderizaResultado(todasDisciplinas, totalDiarios);
    renderizaPorSemestre(todasDisciplinas);
    
    console.log("Fechando browser. Finalizando conexão.");
    await browser.close();
    console.log("END SUAP PROGRAM");
    console.log("\n\n");
})();

function calculaAulasPorSemestre(registros) {
    console.log(registros);
    let semestre = {};
    for (let i = 1; i < registros.length; i++) {
        let registro = registros[i];
        let dataAula = moment(registro.data, 'DD/MM/YYYY');
        //não foi tratado o array, deste modo, no registro.data pode conter a String do cabecalho da tabela
        if (dataAula.isValid()) {
            let qtd = registro.quantidade.split(' ')[0]; //'2 Hora(s)/Aula' -> da para separar pelo espaço
            let keySemestre;
            if (dataAula.month() <= 5) {
                keySemestre = dataAula.year() + "_1"; //2023_1
            } else {
                keySemestre = dataAula.year() + "_2"; //2023_2
            }
            semestre[keySemestre] = semestre[keySemestre] ? semestre[keySemestre] : 0; //cria a chave
            semestre[keySemestre] += parseInt(qtd);
            addKeySemestre(keySemestre);
        }
    }
    return semestre;
}

function renderizaResultado(todasDisciplinas, totalDiarios) {
    //renderiza todos os resultados
    let cont = 1;
    
    for (const diarioKey in todasDisciplinas) {
        if (Object.hasOwnProperty.call(todasDisciplinas, diarioKey)) {
            const disciplina = todasDisciplinas[diarioKey];
            console.log("\n");
            console.log(`--------------- ${cont++} de ${totalDiarios} ---------------------`);
            console.log(`Cód diário: ${diarioKey}`);
            console.log(disciplina.url);
            console.log(`Curso: ${disciplina.curso}`);
            console.log(`Componente: ${disciplina.componente}`);
            console.log(`Turma: ${disciplina.turma}`);
            console.log(`Matriculados: ${disciplina.matriculados}`);
            console.log("Aulas");
            console.log(disciplina.aulasSemestre);
            console.log(`Carga cumprida: ${disciplina.cargaCumprida}`);
        }
    }
}

let somaSemana = 0;
let somaSemestre = 0;
let somaCarga = 0;
let qtdDisciplinas = 0;

function renderizaPorSemestre(todasDisciplinas) {
    keysSemestres = keysSemestres.sort();
    todasDisciplinas = _.sortBy(todasDisciplinas, 'nomeDisciplina');
    for (const semestre of keysSemestres) {
        printCargaMedia();
        console.log(`\n                    ⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
                    ⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿ ${semestre} ⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
                    ⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿\n`.white);

        for (const curso of cursos) {
            let printCurso = true;
            let componenteAnterior = ""; //para guardar o componente que está sendo impresso, visando não imprimir duas vezes
            //para o calculo dos totais
            
            for (const diarioKey in todasDisciplinas) {
                if (Object.hasOwnProperty.call(todasDisciplinas, diarioKey)) {
                    const disciplina = todasDisciplinas[diarioKey];
                    if ( disciplina.aulasSemestre[semestre] > 0 && disciplina.curso == curso ) {
                        //apenas para imprimir o header do curso no relatório
                        if (printCurso) {
                            printCargaMedia();
                            console.log(`\n${curso}`.yellow);
                            printCurso = false;
                        }
                        console.log("\n");
                        if (disciplina.componente != componenteAnterior) {
                            printCargaMedia();
                            console.log(`⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿ COMPONENTE: ${disciplina.componente} ⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿`.cyan);
                            componenteAnterior = disciplina.componente
                            console.log("\n");
                        }
                        console.log(`TURMA: ${disciplina.turma} - Matriculados: ${disciplina.matriculados} - DIÁRIO: ${diarioKey} - ${disciplina.url}`);
                        // console.log(`AULAS: ${disciplina.aulasSemestre[semestre]}`);
                        console.log(`AULAS: SEMANAL | SEMESTRAL | CARGA`);
                        let objAulas = calculaCarga(disciplina.aulasSemestre[semestre], semestre, disciplina.cargaCumprida);
                        console.log(`AULAS:  ${objAulas.semanal}   |    ${objAulas.semestral}     |  ${objAulas.carga}` );
                        
                        addDisciplina( objAulas.semanal, objAulas.semestral, objAulas.carga );
                    }
                }
            }
        }
        
    }
}

function addKeySemestre(keySemestre) {
    if (keysSemestres.indexOf(keySemestre) == -1) {
        keysSemestres.push(keySemestre);
    }
}

function addCurso(curso) {
    if (cursos.indexOf(curso) == -1) {
        cursos.push(curso);
    }
}

function calculaCarga(aulas, semestre, cargaCumprida) {
    if ((semestre == "2021_1" || semestre == "2021_2" || semestre == "2022_1") && cargaCumprida < 90) {
        return {
            semanal     : (aulas / 12).toFixed(2),
            semestral   : aulas,
            carga       : (aulas * 1.25).toFixed(2)
        }
    } else {
        return {
            semanal     : (aulas / 20).toFixed(2),
            semestral   : aulas,
            carga       : (aulas * 0.75).toFixed(2)
        }
    }
}

function addDisciplina(semanal, semestral, carga) {
    somaSemana      += parseFloat(semanal);
    somaSemestre    += parseFloat(semestral);
    somaCarga       += parseFloat(carga);
    qtdDisciplinas++;
}

function printCargaMedia() {
    //se tiver soma de carga, printa o total
    if (qtdDisciplinas > 0) {
        console.log("TOTAL");
        console.log(`AULAS:  ${somaSemana/qtdDisciplinas}   |    ${somaSemestre/qtdDisciplinas}     |  ${somaCarga/qtdDisciplinas}\n` );
        somaSemana = somaSemestre = somaCarga = qtdDisciplinas = 0;
    }
}
