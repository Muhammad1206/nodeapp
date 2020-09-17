'use strict';

const http = require('http');
const mysqlx = require('@mysql/xdevapi');

const port = process.env.PORT || 9999;
const statusOk = 200;
const statusBadRequest = 400;
const statusNotFound = 404;
const statusInternalServerError = 500;
const schema = 'social';

const client = mysqlx.getClient({
  user: 'app',
  password: 'pass',
  host: '0.0.0.0',
  port: 33060
});

function sendResponse(response, {status = statusOk, headers = {}, body = null}) {
  Object.entries(headers).forEach(function ([key, value]) {
    response.setHeader(key, value);
  });
  response.writeHead(status);
  response.end(body);
}

function sendJSON(response, body) {
  sendResponse(response, {
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function map(columns) {
  return row => row.reduce((res, value, i) => ({...res, [columns[i].getColumnLabel()]: value}), {});
}

const methods = new Map();

methods.set('/posts.get', async ({response, db}) => {
  const table = await db.getTable('posts');
  const result = await table.select(['id', 'content', 'likes', 'created'])
  .where('removed=:removed')
  .orderBy('id DESC')
  .bind('removed',false)
  .execute();

  const data = result.fetchAll();
  const columns = result.getColumns();
  const posts = data.map(map(columns));
  sendJSON(response, posts);
});

methods.set('/posts.getById', async ({response, searchParams, db})=> {

  const table = await db.getTable('posts');
  const result = await table.select(['id', 'content', 'likes', 'created'])
  .where('removed=:removed')
  .bind('removed',false)
  .execute();

  const data = result.fetchAll();
  const columns = result.getColumns();
  const posts = data.map(map(columns));


  const id = Number(searchParams.get('id'));
  if (Number.isNaN(id)) {
    sendResponse(response, {status: statusBadRequest});
    return;
  }

  const post = posts.find(o => o.id === id);

    if (post === undefined) {
    sendResponse(response, {status: statusNotFound});
    return;
  } 
  sendJSON(response, post);
});

methods.set('/posts.post', async ({response,searchParams, db})=> {
  
  const table = await db.getTable('posts');

  const textContent = searchParams.get('content');
  if (textContent === null){
    sendResponse(response, {status: statusBadRequest});
  return;
  }
  
  await table.insert('content')
  .values(textContent)
  .execute();
    

  const result = await table.select(['id', 'content', 'likes', 'created'])
  .where('removed=:removed')
  .orderBy('id DESC')
  .bind('removed',false)
  .execute();

  const data = result.fetchAll();
  const columns = result.getColumns();
  const posts = data.map(map(columns));

  sendJSON(response, posts[0]);
});

methods.set('/posts.edit', async ({response, searchParams, db}) => {
  const table = await db.getTable('posts');
  
  const id = Number(searchParams.get('id'));

  if (Number.isNaN(id)) {
    sendResponse(response, {status: statusBadRequest});
    return;
  }

  const textContent = searchParams.get('content');
  if (textContent === null || id===null || id===0){
    sendResponse(response, {status: statusBadRequest});
  return;
  }
  
  

await table.update()
.set('content', textContent)
.where('id = :id')
.bind('id', id)
.execute();


const result = await table.select(['id', 'content', 'likes', 'created'])
  .where('removed=:removed AND id=:id')
  .bind('removed',false)
  .bind('id',id)
  .execute();
  
  const data = result.fetchAll();
  const columns = result.getColumns();
  const posts = data.map(map(columns));

  const post = posts.find(o => o.id === id);

  if (post === undefined) {
  sendResponse(response, {status: statusNotFound});
  return;
}


  sendJSON(response, posts[0]);
});

methods.set('/posts.delete', async ({response, searchParams, db}) => {

  const table = await db.getTable('posts');
  
  const id = Number(searchParams.get('id'));
  if (Number.isNaN(id)) {
    sendResponse(response, {status: statusBadRequest});
    return;
  }
  if (id === 0 || id===null){
    sendResponse(response, {status: statusBadRequest});
    return;
  }
  let result = await table.select(['id', 'content', 'likes', 'created','removed'])
  .where('id=:id')
  .bind('id',id)
  .execute();
  
   let data = result.fetchAll();
   let columns = result.getColumns();
   let posts = data.map(map(columns));
   
   let post = posts.find(value=>value.id===id);
  
   if (post.removed===1 || post === undefined){
    sendResponse(response,{status:statusNotFound});
  }

await table.update()
.set('removed', true)
.where('id =:id')
.bind('id', id)
.execute();

result = await table.select(['id', 'content', 'likes', 'created'])
.where('removed=:removed')
  .bind('removed',true)
  .execute();
  
   data = result.fetchAll();
   columns = result.getColumns();
   posts = data.map(map(columns));
  
   post = posts.find(value=>value.id===id);
  console.log(post);
  sendJSON(response, post);


});

methods.set('/posts.restore', async({response, searchParams, db})=> {
  const table = await db.getTable('posts');
  
  const id = Number(searchParams.get('id'));
  if (Number.isNaN(id)) {
    sendResponse(response, {status: statusBadRequest});
    return;
  }
  if (id === 0 || id===null){
    sendResponse(response, {status: statusBadRequest});
    return;
  }
  let result = await table.select(['id', 'content', 'likes', 'created','removed'])
  .where('id=:id')
  .bind('id',id)
  .execute();
  
   let data = result.fetchAll();
   let columns = result.getColumns();
   let posts = data.map(map(columns));
   
   let post = posts.find(value=>value.id===id);
   console.log(post);
  
   if (post === undefined || post.removed===0 ){
    sendResponse(response,{status:statusNotFound});
    return;
  }

await table.update()
.set('removed', false)
.where('id =:id')
.bind('id', id)
.execute();

result = await table.select(['id', 'content', 'likes', 'created'])
.where('removed=:removed')
  .bind('removed',false)
  .execute();
  
   data = result.fetchAll();
   columns = result.getColumns();
   posts = data.map(map(columns));
  
   post = posts.find(value=>value.id===id);
  sendJSON(response, post);
});
methods.set('/posts.like', async({response, searchParams, db})=> {
  const table = await db.getTable('posts');
  
  const id = Number(searchParams.get('id'));
  if (Number.isNaN(id)) {
    sendResponse(response, {status: statusBadRequest});
    return;
  }
  if (id === 0 || id===null){
    sendResponse(response, {status: statusBadRequest});
    return;
  }
  let result = await table.select(['id', 'content', 'likes', 'created'])
  .where('id=:id AND removed=:removed')
  .bind('id',id)
  .bind('removed',false)
  .execute();
  
   let data = result.fetchAll();
   let columns = result.getColumns();
   let posts = data.map(map(columns));
   
   let post = posts.find(value=>value.id===id);
  
   if (post===undefined|| post.removed===1){
    sendResponse(response,{status:statusNotFound});
    return;
  }
const like = post.likes+1;
console.log(like);

await table.update()
.set('likes', like)
.where('id =:id')
.bind('id', id)
.execute();

result = await table.select(['id', 'content', 'likes', 'created'])
.where('id=:id')
  .bind('id',id)
  .execute();
  
   data = result.fetchAll();
   columns = result.getColumns();
   posts = data.map(map(columns));
  
   post = posts.find(value=>value.id===id);

  sendJSON(response, post);
});

methods.set('/posts.dislike', async({response, searchParams, db})=> {
  const table = await db.getTable('posts');
  
  const id = Number(searchParams.get('id'));
  if (Number.isNaN(id)) {
    sendResponse(response, {status: statusBadRequest});
    return;
  }
  if (id === 0 || id===null){
    sendResponse(response, {status: statusBadRequest});
    return;
  }
  let result = await table.select(['id', 'content', 'likes', 'created'])
  .where('id=:id AND removed=:removed')
  .bind('id',id)
  .bind('removed',false)
  .execute();
  
   let data = result.fetchAll();
   let columns = result.getColumns();
   let posts = data.map(map(columns));
   
   let post = posts.find(value=>value.id===id);
  
   if (post===undefined|| post.removed===1 ){
    sendResponse(response,{status:statusNotFound});
    return;
  }
const like = post.likes-1;
console.log(like);

await table.update()
.set('likes', like)
.where('id =:id')
.bind('id', id)
.execute();

result = await table.select(['id', 'content', 'likes', 'created'])
.where('id=:id')
  .bind('id',id)
  .execute();
  
   data = result.fetchAll();
   columns = result.getColumns();
   posts = data.map(map(columns));
  
   post = posts.find(value=>value.id===id);

  sendJSON(response, post);
});

const server = http.createServer(async (request, response) => {
  const {pathname, searchParams} = new URL(request.url, `http://${request.headers.host}`);

  const method = methods.get(pathname);
  if (method === undefined) {
    sendResponse(response, {status: statusNotFound});
    return;
  }

  let session = null;
  try {
    session = await client.getSession();
    const db = await session.getSchema(schema);

    const params = {
      request,
      response,
      pathname,
      searchParams,
      db,
    };

    await method(params);
  } catch (e) {
    sendResponse(response, {status: statusInternalServerError});
  } finally {
    if (session !== null) {
      try {
        await session.close();
      } catch (e) {
        console.log(e);
      }
    }
  }
});

server.listen(port);
