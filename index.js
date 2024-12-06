const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');

// Schéma GraphQL
const schema = buildSchema(`
  type Comment {
    id: ID!
    content: String!
    author: User
  }

  type Post {
    id: ID!
    title: String
    content: String
    author: User
    likes: [User]
    comments: [Comment]
  }

  type User {
    id: ID!
    name: String
    email: String
    abonnes: [User]
    abonnement: [User]
    posts: [Post]
  }

  type Query {
    user(id: ID!): User
    usersByName(name: String!): [User]
    post(id: ID!): Post
    posts: [Post]
  }

  type Mutation {
    addPost(title: String!, content: String!, authorId: ID!): Post,
    
    likePost(postId: ID!, userId: ID!, comment: String): Post,  # Ajout du paramètre comment
    
    addCommentToPost(postId: ID!, content:String!, authorId:String!): Comment,
    
    addUser(name: String!, email: String!): User,
    
    followUser(followerId:String!, followedId:String!): User # Pour gérer l'abonnement
  }
`);

// Données simulées
const users = [
  { id:"0", name:'Alice', email:'alice@example.com', abonnement:["1"], abonnes:["1"] },
  { id:"1", name:'Bob', email:'bob@example.com', abonnement:["0"], abonnes:["0"] },
  { id:"2", name:'Charlie', email:'charlie@example.com', abonnement:["0"], abonnes:["0"] }
];

const posts = [
  { id:"0", title:'Premier Post', content:'Contenu du premier post', author:"0", likes:["1"], comments:[{id:"0", content:"Super!", author:{id:"1", name:'Bob'}}] },
];

// Résolveurs

/**
 * Root resolver for GraphQL operations.
 * 
 * @type {Object}
 * @property {Function} user - Retrieves a user by ID, including their posts, followers, and followings.
 * @property {Function} addPost - Adds a new post with the given title, content, and author ID.
 * @property {Function} likePost - Likes a post by a user and optionally adds a comment.
 * @property {Function} addUser - Adds a new user with the given name and email.
 * @property {Function} addCommentToPost - Adds a comment to a post by the given post ID, content, and author ID.
 * @property {Function} followUser - Allows a user to follow another user by their IDs.
 */
const root = {
  
  user: ({ id }) => {
    const user = users.find(user => user.id === id);
    if (user) {
      user.posts = posts.filter(post => post.author === user.id);
      // Récupérer les abonnés (utilisateurs qui suivent cet utilisateur)
      user.abonnes = users.filter(u => u.abonnement.includes(user.id));
      // Récupérer les utilisateurs auxquels cet utilisateur est abonné
      user.abonnement = users.filter(u => user.abonnement.includes(u.id));
      return user;
    }
    return null; // Retourne null si l'utilisateur n'existe pas.
  },

  addPost : ({title, content, authorId}) => {
     const newPost = { id:String(posts.length), title, content, author: authorId, likes: [], comments: [] };
     posts.push(newPost);
     return newPost;
  },

  likePost : ({postId, userId, comment}) => {
     const post = posts.find(post => post.id === postId);
     const user = users.find(user => user.id === userId);
     
     if (post && user) {
         // Ajoute l'ID de l'utilisateur aux likes du post.
         if (!post.likes.includes(user.id)) {
             post.likes.push(user.id); 
         }

         // Si un commentaire est fourni, ajoutez-le également aux commentaires du post.
         if (comment) {
             const newComment = { 
                 id: String(post.comments.length + 1), 
                 content: comment, 
                 author: { id: user.id, name: user.name }
             };
             post.comments.push(newComment); // Ajoute le commentaire au post.
         }
     }
     
     return post; // Retourne le post mis à jour.
  },

  addUser : ({ name, email }) => {
     const newUser = { 
       id: String(users.length), // Génération d'un nouvel ID basé sur la longueur actuelle du tableau
       name, 
       email, 
       abonnement: [], // Initialiser la liste des abonnements
       abonnes: [],    // Initialiser la liste des abonnés
       posts: []       // Initialiser la liste des posts
     };
     
     users.push(newUser); // Ajouter le nouvel utilisateur au tableau
     return newUser;      // Retourner le nouvel utilisateur
  },

  addCommentToPost : ({postId, content, authorId}) => {
     const post = posts.find(post => post.id === postId);
     const author = users.find(user => user.id === authorId);

     if (post && author) {
         const newComment = { id:String(post.comments.length + 1), content, author };
         post.comments.push(newComment); // Ajoute le commentaire au post.
         return newComment;
     }

     return null; // Retourne null si le post ou l'auteur n'existe pas.
  },

  followUser : ({followerId, followedId}) => {
     const follower = users.find(user => user.id === followerId);
     const followed = users.find(user => user.id === followedId);

     if (follower && followed) {
         if (!follower.abonnement.includes(followed.id)) {
             follower.abonnement.push(followed.id); // Ajoute à la liste d'abonnement.
             followed.abonnes.push(follower.id); // Ajoute à la liste d'abonnés.
         }
         return followed; // Retourne l'utilisateur suivi.
     }

     return null; // Retourne null si l'un ou l'autre n'existe pas.
  },
};

// Création du serveur Express
const app = express();
app.use('/graphql', graphqlHTTP({
 schema,
 rootValue : root,
 graphiql:true,
}));

// Lancement du serveur
app.listen(4000, () => console.log('Serveur GraphQL lancé sur http://localhost:4000/graphql'));