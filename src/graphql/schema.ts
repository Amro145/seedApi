export const typeDefs = /* GraphQL */ `
  type User {
    id: ID!
    email: String!
    whatsappNumber: String
    isSubscribed: Boolean!
    subscriptionEnd: String
    projects: [Project!]!
  }

  type Project {
    id: ID!
    ownerId: String!
    title: String!
    description: String
    publicCode: Int!
    cloudinaryUrl: String
    owner: User!
  }

  type Subscription {
    id: ID!
    userId: String!
    receiptUrl: String!
    status: String!
  }

  type Query {
    project(publicCode: Int!): Project
    me: User
    users: [User!]!
  }

  type Mutation {
    subscribe(receiptUrl: String!): Subscription!
    followUser(followingId: ID!): Boolean!
  }
`;
