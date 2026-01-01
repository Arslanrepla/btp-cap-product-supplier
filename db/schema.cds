namespace myapp;


@Capabilities.Insertable: true
@Capabilities.Updatable: true
@Capabilities.Deletable: true
entity Supplier{
    key uuid  : UUID;
    name :String;
    description :String;
    address :String;
    email :String;
    tel: String;
    products: Composition of many Product
             on products.supplier = $self;
}


@Capabilities.Insertable: true
@Capabilities.Updatable: true
@Capabilities.Deletable: true
entity Product{
    key uuid  : UUID;
    name :String;
    description :String;
    category :String;
    price :Decimal;
    stock :Integer;
    test: String;
    supplier: Association to Supplier;
}



