## Setup

- Install required packages
  ```
  npm install
  ```
- On VSCode extension store library [Mocha Test Explorer](https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-mocha-test-adapter).

> You must restart VSCode after installing Mocha Test Explorer.

## Testing

A lab flask icon will appear in the left most toolbar. From here you can run or debug the relevant test.

You can also get more information like gas fees and code coverage from running the test in the terminal.

- Test (optimized)
  ```
  npm run test
  ```
- Test (un-optimized)
  ```
  npm run testDebug
  ```
- Coverage
  ```
  npm run coverage
  ```

> Coverage will complain that the contract size is too big, ignore the message as this only relates to the coverage checker.

## Compile

If you only require the compiled code (ABI and/or ByteCode) you can stand-alone compile.

```
npm run compile
```

The solidity compiled `.json` file will be available at `/artifacts/contracts/{ContractFilename}/{ContractName}.json`. This file includes the ABI and the ByteCode.

## Proper gas cost testing

This is a gross method that priority was speed. You are welcome to improve the gasCost calculation method.

- rename the folder `test` to `testBackup`
- rename the folder `gasCostCalcTests` to `test`
- calculate costs
  ```
  npm run gasCost
  ```

When you are finished

- rename the folder `test` to `gasCostCalcTests`
- rename the folder `testBackup` to `test`

## Remix

This can be used with the Remix IDE

Ensure you install remixd is globally, you'll need to restart your terminal for remixd available on `path`.

```
npm install -g @remix-project/remixd@0.5.2
```

> 0.5.3 throws an error

- Launch remixd
  ```
  npm run remixd
  ```
- Navigate to: [remix.ethereum.org](https://remix.ethereum.org/)
- Start the local connection by clicking the `Workspaces Dropdown` and selecting `- connect to localhost -`
