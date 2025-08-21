// TemplateVar helper class to get template variables from the DOM
// When the page is rendered, the server might sends some template variables that are used in the client-side. This class helps to get those variables.
//  Usage:
//  const variable = TemplateVar.get('variableName'); // get the variable value


export default class TemplateVar {

    static vars = {};
    static isBuilt = false;

    static build() {
        const script = document.querySelector('#template-vars');
        if (!script) return;

        try {
            const vars = JSON.parse(script.textContent);
            Object.entries(vars).forEach(([key, value]) => {
                TemplateVar.vars[key] = value;
            });
        }   
        catch (error) {
            console.error('Error parsing template variable:', error);
        }

        script.remove();
        TemplateVar.isBuilt = true;
    }

    static get(key) {
        if (!TemplateVar.isBuilt) {
            TemplateVar.build();
        }
        if (!key) {
            return TemplateVar.vars;
        }
        return TemplateVar.vars[key];
    }

}