## JWT
A user is authorized to access protected resources only if corresponding refresh token exists in the database and has not been revoked. (check this in filter and add sessionId to the request)

set the driver id is the user id

limits the updates of the users and set it compatible with each role (PUT /api/users/me HTTP/1.1)