const { graphql, GraphQLSchema, GraphQLString, GraphQLObjectType } = require('graphql');
const { connectionDefinitions } = require('graphql-relay');
const getFieldList = require('../');

function testGetFields(query, expected, variables) {
  return Promise.resolve().then(() => {
    let actual;

    function resolver(parent, args, context, info) {
      actual = getFieldList(info);
      return { a: 1, b: 2 };
    }
    const resolverSpy = jest.fn(resolver);
    const nodeType = new GraphQLObjectType({
      name: 'SomeType',
      fields: {
        a: { type: GraphQLString },
        b: { type: GraphQLString },
        c: { type: GraphQLString },
        d: { type: GraphQLString }
      },
    });

    const {
      connectionType,
    } = connectionDefinitions({
      nodeType: nodeType,
      name: 'SomeConnectionType',
    });

    const QueryType = new GraphQLObjectType({
      name: 'Query',
      fields: {
        someType: {
          type: nodeType,
          resolve: resolverSpy,
        },
        someConnectionType: {
          type: connectionType,
          resolve: resolverSpy,
        },
      },
    });

    const schema =  new GraphQLSchema({
      query: QueryType,
    });

    const result = graphql(schema, query, undefined, undefined, variables).then((aa) => {
      expect(actual).toEqual(expected);
      expect(resolverSpy).toHaveBeenCalled();
    });
    return result;
  });
}

const wrapAsConnection = (query, fragment) => {
    return fragment + `{ someConnectionType { edges ${query.replace('someType', 'cursor, node')} } }`
};


const testTypes = (description, query, expected, fragment = '') => {
    [fragment + query, wrapAsConnection(query, fragment)].forEach((q, i) => {
        it(`${i === 1 ? 'connections ' : ''}${description}`, () => {
            return testGetFields(q, expected);
        });
    });
};

testTypes('basic query', '{ someType { a b } }', ['a', 'b']);

testTypes(
    'fragment',
    `
    { someType { ...Frag } }
    `,
     ['a'],
    `fragment Frag on SomeType { a }`
);

testTypes(
    'inline fragment',
    '{ someType { ...on SomeType { a } } }',
    ['a'],
);

testTypes(
    '@includes false',
    `{someType { a b @include(if: false) } }`,
    ['a']
);

testTypes(
    '@includes true',
    `{someType { a b @include(if: true) } }`,
    ['a', 'b']
);

testTypes(
    '@skip false',
    `{someType { a b @skip(if: false) } }`,
    ['a', 'b']
);

testTypes(
    '@skip true',
    `{someType { a b @skip(if: true) } }`,
    ['a']
);

testTypes(
    '@include false @skip false',
    `{someType {  b @include(if: false) @skip(if: false)  } }`,
    []
);

testTypes(
    '@include false @skip true',
    `{someType {  b @include(if: false) @skip(if: true)  } }`,
    []
);

testTypes(
    '@include true @skip false',
    `{someType {  b @include(if: true) @skip(if: false)  } }`,
    ['b']
);

testTypes(
    '@include true @skip true',
    `{someType {  b @include(if: true) @skip(if: true)  } }`,
    []
);

testTypes(
    'nested fragments',
    `
    {
        someType {
            ...L1
        }
    }
    `,
    ['a', 'b'],
    `
    fragment L1 on SomeType {
        a
        ...L2
    }
    fragment L2 on SomeType {
        b
    }
    `
);


it('@include variable false', () => {
    return testGetFields(`
    query($test: Boolean!){ 
        someType {
            b @include(if: $test)  
        } 
    }
    `, [], { test: false });
});

it('connections @include variable false', () => {
  return testGetFields(`
    query($test: Boolean!){
        someConnectionType {
            edges {
                cursor
                node {
                    b @include(if: $test)  
                }
            }
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

it('connections @skip variable true', () => {
  return testGetFields(`
    query($test: Boolean!){
        someConnectionType {
            edges {
                cursor
                node {
                    b @skip(if: $test)  
                }
            }
        }
    }
    `, [], { test: true });
});
