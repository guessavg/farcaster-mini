// SPDX‑License‑Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title GuessTwoThirdsGame
 * @notice A blockchain implementation of the “two‑thirds of the average” game.
 *
 *  – Each unique address may join once per round by sending any positive amount of ETH.  
 *  – When the pseudo‑random stop condition is hit, the player whose guess is
 *    closest to ⌊2 / 3 × average⌋ wins the entire prize pool, minus a 1 % fee for the owner.  
 *  – If several players are equally close, the earliest participant wins.
 *
 * @dev  The minimum/maximum early‑stop threshold (`minX`, `maxX`) is chosen
 *       once at deployment, so the game designer can decide how quickly a
 *       round is expected to finish (e.g. 2–3 players, 5–10 players, etc.).
 */
contract GuessTwoThirdsGame is ReentrancyGuard {
    /* --------------------------------------------------------------------- */
    /*                              Data Types                               */
    /* --------------------------------------------------------------------- */

    struct Player {
        address addr;
        uint256 amount;
    }

    /* --------------------------------------------------------------------- */
    /*                            State Variables                            */
    /* --------------------------------------------------------------------- */

    Player[] public players;                 // List of current‑round players
    mapping(address => bool) public hasPlayed;

    uint256 public totalAmount;              // Total ETH in current round
    uint256 public gameId;                   // Incremented after every round
    address public immutable owner;          // Fee receiver (1 %)

    uint256 public immutable minX;           // Lower bound for stop threshold
    uint256 public immutable maxX;           // Upper bound for stop threshold

    /* --------------------------------------------------------------------- */
    /*                                 Events                                */
    /* --------------------------------------------------------------------- */

    event PlayerJoined(address indexed player, uint256 amount);
    event GameEnded(
        uint256 indexed gameId,
        address indexed winner,
        uint256 reward,
        uint256 guessTarget
    );

    /* --------------------------------------------------------------------- */
    /*                               Constructor                             */
    /* --------------------------------------------------------------------- */

    /**
     * @param _minX The smallest possible early‑stop threshold (≥ 1).
     * @param _maxX The largest  possible early‑stop threshold (≥ _minX).
     *
     * Example:  _minX=2, _maxX=3  ⇒  the game may stop after 2 or 3 players,
     *           giving an expected total of ~6–9 participants.
     */
    constructor(uint256 _minX, uint256 _maxX) {
        require(_minX > 0, "minX must be positive");
        require(_maxX >= _minX, "maxX must be >= minX");

        owner = msg.sender;
        gameId = 1;

        minX = _minX;
        maxX = _maxX;
    }

    /* --------------------------------------------------------------------- */
    /*                             Game Interface                            */
    /* --------------------------------------------------------------------- */

    /**
     * @notice Join the current round by sending ETH.
     * @dev    `nonReentrant` prevents re‑entrancy attacks.
     */
    function play() external payable nonReentrant {
        require(!hasPlayed[msg.sender], "You already played");
        require(msg.value > 0, "Must send ETH > 0");

        // Store participation
        players.push(Player(msg.sender, msg.value));
        hasPlayed[msg.sender] = true;
        totalAmount += msg.value;

        emit PlayerJoined(msg.sender, msg.value);

        // Possibly end the game
        if (_shouldEndGame(players.length)) {
            _endGame();
        }
    }

    /* --------------------------------------------------------------------- */
    /*                          Internal Game Logic                          */
    /* --------------------------------------------------------------------- */

    /**
     * @dev  Pseudo‑random stop condition.
     *       Picks x  ∈ [minX, maxX].  The round cannot end before x players
     *       have joined, and the actual end is decided randomly afterwards.
     */
    function _shouldEndGame(uint256 n) internal view returns (bool) {
        // Draw x in the inclusive interval [minX, maxX]
        uint256 x = minX +
            (uint256(
                keccak256(
                    abi.encodePacked(block.prevrandao, block.timestamp, n)
                )
            ) % (maxX - minX + 1));

        if (n < x) return false;                 // Too early to end

        // Second random check to decide whether to stop exactly at n players
        uint256 l = n > x ? n - x : 1;           // Lower bound
        uint256 r = n + x;                       // Upper bound
        uint256 y = l +
            (uint256(
                keccak256(
                    abi.encodePacked(blockhash(block.number - 1), msg.sender)
                )
            ) % (r - l + 1));

        return y == n;
    }

    /**
     * @dev Determines the winner, distributes prize & fee, and resets state.
     */
    function _endGame() internal {
        uint256 average = totalAmount / players.length;
        uint256 target = (average * 2) / 3;          // ⌊2/3 × average⌋

        // Earliest player wins ties
        address winner = players[0].addr;
        uint256 closestDiff = _absDiff(players[0].amount, target);

        for (uint256 i = 1; i < players.length; ++i) {
            uint256 diff = _absDiff(players[i].amount, target);
            if (diff < closestDiff) {
                winner = players[i].addr;
                closestDiff = diff;
            }
        }

        uint256 fee = totalAmount / 100;             // 1 % fee
        uint256 prize = totalAmount - fee;

        // Payouts (use call to forward all remaining gas)
        (bool okWinner, ) = payable(winner).call{value: prize}("");
        require(okWinner, "Prize transfer failed");

        (bool okOwner, ) = payable(owner).call{value: fee}("");
        require(okOwner, "Fee transfer failed");

        emit GameEnded(gameId, winner, prize, target);

        // Reset state for next round
        for (uint256 i = 0; i < players.length; ++i) {
            hasPlayed[players[i].addr] = false;
        }
        delete players;
        totalAmount = 0;
        ++gameId;
    }

    /* --------------------------------------------------------------------- */
    /*                         Pure / View Utilities                         */
    /* --------------------------------------------------------------------- */

    function _absDiff(uint256 a, uint256 b) private pure returns (uint256) {
        return a > b ? a - b : b - a;
    }

    /* --------------------------------------------------------------------- */

    // Accept ETH sent directly to the contract
    receive() external payable {}
}