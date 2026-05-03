namespace my.bookshop;

entity Books {
  key ID    : Integer;
      title : String(200);
      author: String(100);
      stock : Integer;
}
