# SSH-Tuna

An alternative to Serveo/Ngrok that allows more control and also can be integrated with a webpack dev server to expose automatically our local dev servers to the internet using easy to remember (sub\*n)domains.
Still lacks a lot of stuff, but should work correctly using the client in `client.ts`.

TODO (random order):

- Write documentation

- Complete TODO list (done, actually, with this)

- Add tests

- Right now first the client 'asks' for the allocation of a port and a subdomain, and only then creates the tunnel via ssh. This could simply require the second part (I mean serveo does it this way)
