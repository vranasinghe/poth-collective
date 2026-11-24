const request = require('supertest');
const { startDb,clearDb,stopDb } = require('./helpers/db');
const f = require('./helpers/factory');
const Book = require('../models/bookModel');
const Shop = require('../models/shopModel');
let app;
beforeAll(async()=>{app=await startDb();});afterAll(stopDb);beforeEach(clearDb);
const get=(path,token)=>{const r=request(app).get(`/api/merchant/${path}`);return token?r.set(f.bearer(token)):r;};
test.each(['summary','inventory','orders'])('%s rejects anonymous and non-owner sessions',async path=>{expect((await get(path)).status).toBe(401);const c=await f.customer(app);expect((await get(path,c.token)).status).toBe(403);});
test('summary calculates authorized stock and order metrics, never sample revenue or activity',async()=>{
 const a=await f.scenario(app);const b=await f.scenario(app);const reader=await f.customer(app);
 await f.createBook(app,a.shopOwner.token,a.shop._id,{stockCount:3,title:'Low stock'});await f.createBook(app,a.shopOwner.token,a.shop._id,{stockCount:0,title:'Empty shelf'});
 const placed=await f.placeOrder(app,reader.token,{book:a.book._id,quantity:2});expect(placed.status).toBe(201);
 const result=await get('summary',a.shopOwner.token);
 expect(result.status).toBe(200);expect(result.body.inventory).toMatchObject({activeBooks:3,units:11,lowStock:1,outOfStock:1});expect(result.body.statusCounts).toMatchObject({Pending:1,Confirmed:0,Delivered:0});expect(result.body.categories).toEqual([{category:'Fiction',books:3,units:11}]);
 expect(result.body.recentOrders[0]._id).toBe(placed.body._id);expect(result.body.recentOrders[0].allowedStatuses).toEqual(['Confirmed','Cancelled']);
 expect(JSON.stringify(result.body)).not.toContain(b.shop._id);expect(result.body.revenue).toBeUndefined();expect(result.body.growth).toBeUndefined();
});
test('inventory filters, sorts and paginates only the owner’s books',async()=>{
 const a=await f.scenario(app);const b=await f.scenario(app);
 const low=await f.createBook(app,a.shopOwner.token,a.shop._id,{title:'A low book',stockCount:3,price:200});await f.createBook(app,a.shopOwner.token,a.shop._id,{title:'B empty book',stockCount:0,price:50});
 let r=await get('inventory?stock=low',a.shopOwner.token);expect(r.body.total).toBe(1);expect(r.body.items[0]._id).toBe(low._id);
 r=await get('inventory?stock=out',a.shopOwner.token);expect(r.body.items[0].stockCount).toBe(0);
 r=await get('inventory?sort=price-asc&limit=1&page=2',a.shopOwner.token);expect(r.body).toMatchObject({total:3,page:2,pages:3});expect(r.body.items[0].price).toBe(200);
 r=await get(`inventory?shopOwner=${b.shopOwner.id}&q=Some%20Author`,a.shopOwner.token);expect(r.body.total).toBe(3);expect(JSON.stringify(r.body)).not.toContain(b.book._id);
 expect((await get('inventory?q=.*',a.shopOwner.token)).body.total).toBe(0);
 expect((await get('inventory?stock=invalid',a.shopOwner.token)).status).toBe(400);
});
test.each(['summary','inventory','orders'])('%s refuses a selected foreign shop',async path=>{const a=await f.scenario(app);const b=await f.scenario(app);expect((await get(`${path}?shop=${b.shop._id}`,a.shopOwner.token)).status).toBe(403);});
test('direct inventory, order and payment evidence access cannot cross shop ownership',async()=>{
 const a=await f.scenario(app);const b=await f.scenario(app);const reader=await f.customer(app);const order=await f.placeOrder(app,reader.token,{book:b.book._id});
 expect((await get(`inventory/${b.book._id}`,a.shopOwner.token)).status).toBe(404);
 const denied=await get(`orders/${order.body._id}`,a.shopOwner.token);expect(denied.status).toBe(404);expect(denied.body.paymentSlipUrl).toBeUndefined();expect(JSON.stringify(denied.body)).not.toContain(reader.email);
 const own=await get(`orders/${order.body._id}`,b.shopOwner.token);expect(own.status).toBe(200);expect(own.body.reader.email).toBe(reader.email);expect(own.body.paymentSlipUrl).toBeTruthy();
});
test('status filtering and reported transition actions match actual backend lifecycle',async()=>{
 const a=await f.scenario(app);const c=await f.customer(app);const o=await f.placeOrder(app,c.token,{book:a.book._id});
 await f.setStatus(app,a.shopOwner.token,o.body._id,'Confirmed');
 expect((await get('orders?status=Pending',a.shopOwner.token)).body.total).toBe(0);
 const list=await get('orders?status=Confirmed',a.shopOwner.token);expect(list.body.total).toBe(1);expect(list.body.items[0].allowedStatuses).toEqual(['Shipped','Cancelled']);
 await f.setStatus(app,a.shopOwner.token,o.body._id,'Shipped');
 expect((await get(`orders/${o.body._id}`,a.shopOwner.token)).body.allowedStatuses).toEqual(['Delivered']);
 expect((await get('orders?status=invalid',a.shopOwner.token)).status).toBe(400);
});
test('stale stock edits cannot overwrite a reservation; legacy writes remain compatible',async()=>{
 const a=await f.scenario(app);const c=await f.customer(app);await f.placeOrder(app,c.token,{book:a.book._id,quantity:2});
 const stale=await request(app).put(`/api/books/${a.book._id}`).set(f.bearer(a.shopOwner.token)).send({stockCount:20,expectedStockCount:10});expect(stale.status).toBe(409);expect((await Book.findById(a.book._id)).stockCount).toBe(8);
 const fresh=await request(app).put(`/api/books/${a.book._id}`).set(f.bearer(a.shopOwner.token)).send({stockCount:12,expectedStockCount:8});expect(fresh.status).toBe(200);expect(fresh.body.stockCount).toBe(12);
 expect((await request(app).put(`/api/books/${a.book._id}`).set(f.bearer(a.shopOwner.token)).send({description:'Updated description'})).status).toBe(200);
});
test('an archived shop’s retained order history remains accessible only to its owner',async()=>{
 const a=await f.scenario(app);const c=await f.customer(app);const o=await f.placeOrder(app,c.token,{book:a.book._id});await Shop.findByIdAndUpdate(a.shop._id,{archivedAt:new Date()});
 expect((await get('orders',a.shopOwner.token)).body.total).toBe(1);expect((await get(`orders/${o.body._id}`,a.shopOwner.token)).status).toBe(200);expect((await get('inventory',a.shopOwner.token)).body.total).toBe(0);
});
test('empty owner accounts get complete zero-state payloads',async()=>{const a=await f.owner(app);const r=await get('summary',a.token);expect(r.body).toMatchObject({shops:[],inventory:{activeBooks:0,units:0,lowStock:0,outOfStock:0},statusCounts:{Pending:0,Confirmed:0,Shipped:0,Delivered:0,Cancelled:0},categories:[],attention:[],recentOrders:[]});});
