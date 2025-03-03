import * as Handlebars from "handlebars";

export function registerHandlebarsHelpers() {
    Handlebars.registerHelper('error', function(message) {
        console.error(message);
        return new Handlebars.SafeString(`<span class="error">${message}</span>`);
    });

    Handlebars.registerHelper('empty', function(value) {
        return value === null || value === '';
    });

    Handlebars.registerHelper('eq', function(a, b) {
        return a === b;
    });

    Handlebars.registerHelper('concat', function(...args) {
        return args.slice(0, -1).join('');
    });

    Handlebars.registerHelper("setVar", function(varName, varValue, options) {
        options.data.root[varName] = varValue;
    });

    Handlebars.registerHelper('lowercase', function(str) {
        if (typeof str !== 'string') {return '';}
        return str.toLowerCase();
    });
}