const { graphql, GraphQLSchema, GraphQLString, GraphQLObjectType } = require('graphql');
const getFieldList = require('../');

function testGetFields(query, expected, variables) {
    return Promise.resolve().then(() => {
        let actual;
        function resolver(parent, args, context, info) {
            actual = getFieldList(info);
            return { a: 1, b: 2, c: 3, d: 4, e: { a: 5 } };
        }
        const resolverSpy = jest.fn(resolver);
        const EType = new GraphQLObjectType({
            name: 'NestedType',
            fields: () => ({
                x: { type: GraphQLString },
                e: { type: EType },
            }),
        });
        const QueryType = new GraphQLObjectType({
            name: 'Query',
            fields: {
                scalarField: {
                    type: GraphQLString,
                    resolve: resolverSpy,
                },
                someType: {
                    type: new GraphQLObjectType({
                        name: 'SomeType',
                        fields: {
                            a: { type: GraphQLString },
                            b: { type: GraphQLString },
                            c: { type: GraphQLString },
                            d: { type: GraphQLString },
                            e: { type: EType },
                        },
                    }),
                    resolve: resolverSpy,
                },
            },
        });
        const schema = new GraphQLSchema({
            query: QueryType,
        });

        const result = graphql({ schema, source: query, variableValues: variables }).then(() => {
            expect(actual).toEqual(expected);
            expect(resolverSpy).toHaveBeenCalled();
        });
        return result;
    });
}

it('basic query', () => {
    return testGetFields('{ someType { a b } }', ['a', 'b']);
});

it('get fields on scalar field', () => {
    return testGetFields('{ scalarField }', []);
});

it('fragment', () => {
    return testGetFields(
        `
    fragment Frag on SomeType {
        a
    }
    { someType { ...Frag } }
    `,
        ['a'],
    );
});

it('inline fragment', () => {
    return testGetFields(
        `
    { someType { ...on SomeType { a } } }
    `,
        ['a'],
    );
});

it('@include false', () => {
    return testGetFields(
        `
    { 
        someType {
            a
            b @include(if: false) 
        } 
    }
    `,
        ['a'],
    );
});

it('@include true', () => {
    return testGetFields(
        `
    { 
        someType {
            a
            b @include(if: true) 
        } 
    }
    `,
        ['a', 'b'],
    );
});

it('@skip false', () => {
    return testGetFields(
        `
    { 
        someType {
            a
            b @skip(if: false) 
        } 
    }
    `,
        ['a', 'b'],
    );
});

it('@skip true', () => {
    return testGetFields(
        `
    { 
        someType {
            a
            b @skip(if: true) 
        } 
    }
    `,
        ['a'],
    );
});
it('@include false @skip false', () => {
    return testGetFields(
        `
    { 
        someType {
            b @include(if: false) @skip(if: false)  
        } 
    }
    `,
        [],
    );
});
it('@include false @skip true', () => {
    return testGetFields(
        `
    { 
        someType {
            b @include(if: false) @skip(if: true)  
        } 
    }
    `,
        [],
    );
});
it('@include true @skip false', () => {
    return testGetFields(
        `
    { 
        someType {
            b @include(if: true) @skip(if: false)  
        } 
    }
    `,
        ['b'],
    );
});
it('@include true @skip true', () => {
    return testGetFields(
        `
    { 
        someType {
            b @include(if: true) @skip(if: true)  
        } 
    }
    `,
        [],
    );
});
it('@include variable false', () => {
    return testGetFields(
        `
    query($test: Boolean!){ 
        someType {
            b @include(if: $test)  
        } 
    }
    `,
        [],
        { test: false },
    );
});
it('@skip variable true', () => {
    return testGetFields(
        `
    query($test: Boolean!){ 
        someType {
            b @skip(if: $test)  
        } 
    }
    `,
        [],
        { test: true },
    );
});

it('nested fragments', () => {
    return testGetFields(
        `
    {
        someType {
            ...L1
        }
    }
    fragment L1 on SomeType {
        a
        ...L2
    }
    fragment L2 on SomeType {
        b
    }
    `,
        ['a', 'b'],
    );
});

it('works with nested types', () => {
    return testGetFields(
        `
    {
        someType {
            a
            b
            e {
                x
            }
        }
    }
    `,
        ['a', 'b', 'e.x'],
    );
});

it('works with doubly nested types', () => {
    return testGetFields(
        `
    {
        someType {
            a
            b
            e {
                e {
                    x
                }
            }
        }
    }
    `,
        ['a', 'b', 'e.e.x'],
    );
});

it('works with nested types and fragments', () => {
    return testGetFields(
        `
    {
        someType {
            a
            b
            e {
                ...F1
            }
        }
    }
    fragment F1 on NestedType {
        x
    }
    `,
        ['a', 'b', 'e.x'],
    );
});

it('works with nested types and inline fragments', () => {
    return testGetFields(
        `
    {
        someType {
            a
            b
            e {
                ... on NestedType {
                    x
                }
            }
        }
    }
    `,
        ['a', 'b', 'e.x'],
    );
});

it('works with super duper nested types', () => {
    return testGetFields(
        `
    {
        someType {
            a
            b
            e {
                e {
                    e {
                        e {
                            e {
                                x
                            }
                        }
                    }
                }
            }
        }
    }
    `,
        ['a', 'b', 'e.e.e.e.e.x'],
    );
});

it('handles undefined directives', () => {
    // Relevant ast info bits included
    const info = {
        fieldName: 'someType',
        fieldNodes: [
            {
                kind: 'Field',
                alias: null,
                name: {
                    kind: 'Name',
                    value: 'someType',
                    loc: {
                        start: 2,
                        end: 10,
                    },
                },
                arguments: [],
                directives: [],
                selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                        {
                            kind: 'Field',
                            alias: null,
                            name: {
                                kind: 'Name',
                                value: 'a',
                                loc: {
                                    start: 13,
                                    end: 14,
                                },
                            },
                            arguments: [],
                            // deliberately excluded for test "directives": [],
                            selectionSet: null,
                            loc: {
                                start: 13,
                                end: 14,
                            },
                        },
                        {
                            kind: 'Field',
                            alias: null,
                            name: {
                                kind: 'Name',
                                value: 'b',
                                loc: {
                                    start: 15,
                                    end: 16,
                                },
                            },
                            arguments: [],
                            directives: [],
                            selectionSet: null,
                            loc: {
                                start: 15,
                                end: 16,
                            },
                        },
                    ],
                    loc: {
                        start: 11,
                        end: 18,
                    },
                },
                loc: {
                    start: 2,
                    end: 18,
                },
            },
        ],
        returnType: 'SomeType',
        parentType: 'Query',
        path: {
            key: 'someType',
        },
        fragments: {},
        variableValues: {},
    };

    expect(getFieldList(info)).toEqual(['a', 'b']);
});
