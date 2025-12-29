export const typeDefs = /* GraphQL */ `
  type User {
    id: ID!
    email: String!
    googleId: String
    whatsappNumber: String
    isSubscribed: Boolean!
    subscriptionEnd: String
    projects: [Project!]!
    reviews: [Review!]!
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

  type Review {
    id: ID!
    userId: String!
    projectId: String
    targetUserId: String
    rating: Int!
    comment: String
  }

  input ProjectInput {
    title: String!
    description: String
    cloudinaryUrl: String
  }

  type AuthResponse {
    token: String!
    user: User!
  }

  type Query {
    project(publicCode: Int!): Project
    me: User
    users: [User!]!
  }

  type Mutation {
    subscribe(receiptUrl: String!): Subscription!
    followUser(followingId: ID!): Boolean!
    createProject(input: ProjectInput!): Project!
    updateProfile(whatsappNumber: String!): User!
    authGoogle(idToken: String!): AuthResponse!
  }
`;
