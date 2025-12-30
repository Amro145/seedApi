export const typeDefs = /* GraphQL */ `
  type User {
    id: ID!
    email: String!
    name: String
    image: String
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
    category: String
    place: String
    price: Int
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
    category: String
    place: String
    price: Int
  }

  input ProjectFilter {
    category: String
    place: String
    minPrice: Int
    maxPrice: Int
  }

  type Query {
    project(publicCode: Int!): Project
    me: User
    users: [User!]!
    projects(filter: ProjectFilter): [Project!]!
    pendingSubscriptions: [Subscription!]!
    profile(userId: ID!): User
  }

  type AuthPayload {
    user: User!
    token: String!
  }

  type Mutation {
    subscribe(receiptUrl: String!): Subscription!
    followUser(followingId: ID!): Boolean!
    createProject(input: ProjectInput!): Project!
    updateProfile(whatsappNumber: String!): User!
    login(email: String!, password: String!): AuthPayload!
    signUp(email: String!, password: String!): User!
    logout: Boolean!
    approveSubscription(id: String!, userId: String!): User!
    ratingProject(projectId: String!, ratingValue: Int!): Review!
  }
`;
