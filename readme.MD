# SSH-Tuna

An alternative to Serveo/Ngrok that allows more control and also can be integrated with a webpack dev server to expose automatically our local dev servers to the internet using easy to remember (sub\*n)domains.
Still lacks a lot of stuff, but should work correctly using the client in `client.js`.

TODO (random order):

- Write documentation

- Complete TODO list (done, actually, with this)

- Add tests

- Integrate in create-accurapp/create-svelte-accurapp?

- Avoid using 2 calls: simply create an ssh tunnel and look for the first open port in the ssh server, it would make everything easier!
