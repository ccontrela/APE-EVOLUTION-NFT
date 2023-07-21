// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

contract MergeArrays {
    constructor() {
        uint256[] memory a;
        uint256[] memory b;
        (
            uint256[] memory mergedTokens,
            uint256 mergedTokensLength
        ) = mergeArrays(a, b);

        for (uint256 i; i < mergedTokensLength; i++) {
            // require(
            //     msg.sender == contract.ownerOf(mergedTokens[i]),
            //     "Token not owned"
            // );
            mergedTokens[i];
        }
    }

    function mergeArrays(uint256[] memory a, uint256[] memory b)
        internal
        pure
        returns (uint256[] memory result, uint256 resultLength)
    {
        (uint256 aI, uint256 bI, uint256 cI) = (0, 0, 0);
        uint256[] memory c = new uint256[](a.length + b.length);

        while (true) {
            if (aI == a.length && bI == b.length) {
                break;
            } else if (aI < a.length && bI < b.length && a[aI] == b[bI]) {
                c[cI] = a[aI];
                (aI++, bI++, cI++);
            } else if (aI < a.length && (bI == b.length || a[aI] < b[bI])) {
                c[cI] = a[aI];
                (aI++, cI++);
            } else if (bI < b.length && (aI == a.length || a[aI] > b[bI])) {
                c[cI] = b[bI];
                (bI++, cI++);
            }
        }

        return (c, cI);
    }
}
