var Todo = Todo || (function () {
  var self = {};

  EasyApi.makeApi(self, 'logoutRequest', 'DELETE', '/session');
  EasyApi.makeApi(self, 'loginRequest',  'POST',   '/session', ['email', 'password']);
  EasyApi.makeApi(self, 'getTodoList',   'GET',    '/todo');
  EasyApi.makeApi(self, 'Item.get',      'GET',    '/todo/item/:itemId');
  EasyApi.makeApi(self, 'Item.add',      'POST',   '/todo/item');
  EasyApi.makeApi(self, 'Item.update',   'PUT',    '/todo/item/:itemId');
  EasyApi.makeApi(self, 'Item.delete',   'DELETE', '/todo/item/:itemId');

  return self;
}());
