# graphql-list-fields

When implementing a GraphQL server, it can be useful to know the list of fields being queried on
a given type. This module takes a GraphQLResolveInfo object and returns a list of fields.

Supported features
- Basic Fields
- Fragments
- Inline Fragments
- `@skip` and `@include` directives

```
npm install --save graphql-list-fields
```

## Usage
```javascript
import getFieldNames from 'graphql-list-fields';

// in some resolve function
resolve(parent, args, context, info) {
    const fields = getFieldNames(info);
    return fetch('/someservice/?fields=' + fields.join(','));
}
```