import TemplateVar from "./helpers/template-var.js";
import Form from './components/form.js';

import '../less/index.less';

console.log(TemplateVar.get());

const form = new Form(document.querySelector('form.user-search'));


