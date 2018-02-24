function getBooleanArgumentValue(context, ast) {
    const argument = ast.arguments[0].value;
    switch (argument.kind) {
        case 'BooleanValue':
            return argument.value;
        case 'Variable':
            return context.variableValues[argument.name.value];
    }
}

function isExcludedByDirective(context, ast) {
    const directives = ast.directives;
    let isExcluded = false;
    directives.forEach((directive) => {
        switch (directive.name.value) {
            case 'include':
                isExcluded = isExcluded || !getBooleanArgumentValue(context, directive);
                break;
            case 'skip':
                isExcluded = isExcluded || getBooleanArgumentValue(context, directive);
                break;
        }
    });
    return isExcluded;
}

function dotConcat(a, b) {
    return a ? `${a}.${b}` : b;
}

function getFieldSet(context, asts = context.fieldASTs || context.fieldNodes, prefix = '') {
    // for recursion: fragments doesn't have many sets
    if (!Array.isArray(asts)) {
        asts = [asts];
    }

    const selections = asts.reduce((selections, source) => {
        if (source && source.selectionSet && source.selectionSet.selections) {
            selections.push(...source.selectionSet.selections);
        }
        return selections;
    }, []);

    return selections.reduce((set, ast) => {
        if (isExcludedByDirective(context, ast)) {
            return set;
        }
        switch (ast.kind) {
            case 'Field':
                const newPrefix = dotConcat(prefix, ast.name.value);
                if (ast.selectionSet) {
                    return Object.assign({}, set, getFieldSet(context, ast, newPrefix));
                } else {
                    set[newPrefix] = true;
                    return set;
                }
            case 'InlineFragment':
                return Object.assign({}, set, getFieldSet(context, ast, prefix));
            case 'FragmentSpread':
                return Object.assign({}, set, getFieldSet(context, context.fragments[ast.name.value], prefix));
        }
    }, {});
}

module.exports = function getFieldList(context) {
    return Object.keys(getFieldSet(context));
};
