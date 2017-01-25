const { graphql, GraphQLSchema, GraphQLString, GraphQLObjectType, buildSchema } = require('graphql');
const getFieldList = require('../');
const { Parser, Printer } = require('graphql/language');

function testGetFields(query, expected, variables) {
    return Promise.resolve().then(() => {    
        let actual;
        function resolver(parent, args, context, info) {
            actual = getFieldList(info);
            return { a: 1, b: 2 };
        }
        const resolverSpy = jest.fn(resolver);
        const QueryType = new GraphQLObjectType({
            name: 'Query',
            fields: {
                someType: {
                    type: new GraphQLObjectType({
                        name: 'SomeType',
                        fields: {
                            a: { type: GraphQLString },
                            b: { type: GraphQLString },
                            c: { type: GraphQLString },
                            d: { type: GraphQLString }
                        },
                    }),
                    resolve: resolverSpy
                }
            },
        });
        const schema =  new GraphQLSchema({
            query: QueryType,
        });

        const result = graphql(schema, query, undefined, undefined, variables).then(() => {
            expect(actual).toEqual(expected);
            expect(resolverSpy).toHaveBeenCalled();
        });
        return result;
    });
}

it('basic query', () => {
    return testGetFields('{ someType { a b } }', ['a', 'b']);
});

it('fragment', () => {
    return testGetFields(`
    fragment Frag on SomeType {
        a
    }
    { someType { ...Frag } }
    `, ['a']);
});
it('inline fragment', () => {
    return testGetFields(`
    { someType { ...on SomeType { a } } }
    `, ['a']);
});

it('@include false', () => {
    return testGetFields(`
    { 
        someType {
            a
            b @include(if: false) 
        } 
    }
    `, ['a']);
});

it('@include true', () => {
    return testGetFields(`
    { 
        someType {
            a
            b @include(if: true) 
        } 
    }
    `, ['a', 'b']);
});

it('@skip false', () => {
    return testGetFields(`
    { 
        someType {
            a
            b @skip(if: false) 
        } 
    }
    `, ['a', 'b']);
});

it('@skip true', () => {
    return testGetFields(`
    { 
        someType {
            a
            b @skip(if: true) 
        } 
    }
    `, ['a']);
});
it('@include false @skip false', () => {
    return testGetFields(`
    { 
        someType {
            b @include(if: false) @skip(if: false)  
        } 
    }
    `, []);
});
it('@include false @skip true', () => {
    return testGetFields(`
    { 
        someType {
            b @include(if: false) @skip(if: true)  
        } 
    }
    `, []);
});
it('@include true @skip false', () => {
    return testGetFields(`
    { 
        someType {
            b @include(if: true) @skip(if: false)  
        } 
    }
    `, ['b']);
});
it('@include true @skip true', () => {
    return testGetFields(`
    { 
        someType {
            b @include(if: true) @skip(if: true)  
        } 
    }
    `, []);
});
it('@include variable false', () => {
    return testGetFields(`
    query($test: Boolean!){ 
        someType {
            b @include(if: $test)  
        } 
    }
    `, [], { test: false });
});
it('@skip variable true', () => {
    return testGetFields(`
    query($test: Boolean!){ 
        someType {
            b @skip(if: $test)  
        } 
    }
    `, [], { test: true });
});

it('nested fragments', () => {
    return testGetFields(`
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
    `, ['a', 'b']);
});