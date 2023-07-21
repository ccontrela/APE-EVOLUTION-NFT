// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract StandardERC721 is ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    constructor() ERC721("", "") {}

    function safeMintTo(address to, uint256 quantity) public {
        for (uint256 i; i < quantity; i++) {
            uint256 tokenId = _tokenIdCounter.current();
            _tokenIdCounter.increment();
            _safeMint(to, tokenId);
        }
    }

    function safeMint(uint256 quantity) public {
        for (uint256 i; i < quantity; i++) {
            uint256 tokenId = _tokenIdCounter.current();
            _tokenIdCounter.increment();
            _safeMint(msg.sender, tokenId);
        }
    }

    function _baseURI() internal pure override returns (string memory) {
        return
            "https://angryapes.mypinata.cloud/ipfs/QmentwAN9Lrffbix6iesK7VBT7oKEFGuMaeYmb1hJsQmqM/";
    }
}
