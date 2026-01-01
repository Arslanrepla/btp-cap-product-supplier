using myapp from '../db/schema';

service CatalogService @(path:'/odata/v4/catalog') {
    entity Products as projection on myapp.Product;
    entity Suppliers as projection on myapp.Supplier;    

}