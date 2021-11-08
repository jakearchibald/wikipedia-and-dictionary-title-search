This is a silly little thing I created to search for words and Wikipedia titles starting or ending with a particular substring.

It's build with [Deno](https://deno.land/).

## Creating the database

**This will create a database over 2Gb in size** and take about 5-10 minutes.

```sh
deno run --allow-net --allow-read --allow-write create-db.ts
```

## Searching

```sh
deno run --allow-read find.ts --starts='hello' | column
```

For other options:

```sh
deno run find.ts --help
```
