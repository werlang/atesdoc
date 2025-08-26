export default {
    baseUrl: 'https://suap.ifsul.edu.br',
    login: {
        url: 'accounts/login/',
        username: '#id_username',
        password: '#id_password',
        submit: 'input[type="submit"]',
        ready: '#user-tools .user-profile'
    },
    professorSearch: {
        url: 'admin/edu/professor/',
        query: {
            vinculo__setor__uo: 4, // campus CH
            q: 'USERDATA',
            tab: 'tab_any_data'
        },
        ready: 'table#result_list, #changelist-form .msg.alert',
        rows: 'table#result_list tr',
        hasRows: 'td.field-get_dados_gerais dd',
        data: {
            id: (tr) => parseInt(tr.querySelector('th a.icon-view')?.href.match(/\/edu\/professor\/(\d*)\//)[1]),
            name: (tr) => tr.querySelectorAll('td.field-get_dados_gerais dd')?.[0]?.textContent.trim(),
            cpf: (tr) => tr.querySelectorAll('td.field-get_dados_gerais dd')?.[1]?.textContent.trim(),
            email: (tr) => tr.querySelectorAll('td.field-get_dados_gerais dd')?.[3]?.textContent.trim(),
            siape: (tr) => tr.querySelector('td.field-display_matricula')?.textContent.trim(),
            picture: (tr) => tr.querySelector('td.field-get_foto img')?.src,
        }
    },
    bookSearch: {
        // `edu/professor/${professorId}/?tab=disciplinas&ano-periodo=${semester}`
        url: {
            base: 'edu/professor',
            query: 'tab=disciplinas&ano-periodo='
        },
        ready: '#form_periodo_letivo',
        rows: '.box table tr',
        data: {
            semester: (tr) => tr.querySelectorAll('td')?.[0]?.textContent.trim(),
            link: (tr) => tr.querySelectorAll('td')?.[1]?.querySelector('a')?.href,
            book: (tr) => tr.querySelectorAll('td')?.[1]?.textContent.trim(),
            class: (tr) => tr.querySelectorAll('td')?.[2]?.textContent.trim(),
        }
        
    }
}