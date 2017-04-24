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
    if(directives) {
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
    }
    return isExcluded;
}

function getFieldSet(context, asts = context.fieldASTs || context.fieldNodes) {
    // for recursion: fragments doesn't have many sets
    if (!Array.isArray(asts)) {
        asts = [asts];
    }

    const selections = asts.reduce((selections, source) => {
        selections.push(...source.selectionSet.selections);
        return selections;
    }, []);

    return selections.reduce((set, ast) => {
        if (isExcludedByDirective(context, ast)) {
            return set;
        }
        switch (ast.kind) {
            case 'Field':
                set[ast.name.value] = true;
                return set;
            case 'InlineFragment':
                return Object.assign({}, set, getFieldSet(context, ast));
            case 'FragmentSpread':
                return Object.assign({}, set, getFieldSet(context, context.fragments[ast.name.value]));
        }
    }, {});
}

module.exports = function getFieldList(context) {
    return Object.keys(getFieldSet(context));
};
