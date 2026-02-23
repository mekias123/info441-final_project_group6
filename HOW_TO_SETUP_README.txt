- This project is composed of a node server (backend) and uses vite to build the client (frontend).
- This means that the server that runs code and the server that hosts the webpage are on different ports
    - Node server: port 3001 (http://localhost:3001/)
    - Client server: port 5173 (http://localhost:5173/)
- Both parts are their own npm instance

SETUP:
1. The code expects a mongoose uri in a .env file like this (you can just use my mongoose instance 4 now): 
    MONGODB_URI="mongodb+srv://my-user:2-Pass@cluster0.d2bnl3g.mongodb.net/?appName=Cluster0"
2. npm run install-all
3. npm run server
4. (in another console) npm run client
