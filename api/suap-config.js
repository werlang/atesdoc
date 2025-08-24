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
        ready: 'table#result_list tr',
    },
}