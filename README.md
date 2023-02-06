# MessagePack

### Purpose
This repository is a simple implementation to convert a `JSON` object to a `MessagePack` format and vice versa.

### Setting Up
First check you have the LTS version of node installed on your machine. I use v18.13.0 to develop this project.

Once checked, clone this project and cd in the folder, then run `npm install` to install dependencies.

### Interface Testing
An user interface for testing is provided. After `npm install`, type `npm run serve` and it will start building Typescript files and setup an Express server.

You can view the interface on `http://localhost:3000`.

The upper-left textarea takes `JSON` object or other primitive type for encoding, such as `Number`, `Array` and `String`. Click `encode` button and you can view the result on upper-right textarea.

The bottom-left textarea, on the other hand, takes `MessagePack`, or anything come out from the upper-right section. Click `decode` button and you can view original data on the bottom-right textarea.

### Unit Testing
After installing, head to `test` folder to add any test file you like. Once added, run `npm run test` to execute all test cases.

Make sure you import these two necessary classes before writing test cases:
```
import { encode } from '../src/Encoder';
import { decode } from '../src/Decoder';
```

### References
[MessagePack Official Site](https://msgpack.org)