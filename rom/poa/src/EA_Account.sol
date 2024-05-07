// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

contract EA_Account {
    //Most Closely Matches the Person Struct in Dalisay and Bueno's implementation
    struct Voter {
        string encrypted_full_name;
        string public_key;
        address addr;
        string[] elections_joined;
    }

    struct Candidate {
        uint id;
        string name;
        string role;
    }

    struct History {
        string[] transactions;
        string[] signatures;
        string encrypted_ea_height;
    }

    struct Election {
        string election_name;
        bool voter_visible;
        bool election_over;
        uint[] candidate_list;
        mapping(uint => Candidate) candidate_store;
        mapping(address => string) voter_addresses_to_encrypted_control_keys;
        mapping(address => bool) authorized_control_addresses;
        mapping(address => History) control_keys_to_histories;
        mapping(uint => uint) election_results;
    }

    //These variables hold the EA Account's state
    address authority_address;
    string authority_pubkey;

    //Need an unbounded array of voters

    address[] address_list;
    mapping(address => Voter) addressed_voters;

    //Need a mapping from election names to actual Election structs, and an array full of election names
    mapping(string => Election) all_elections;
    string[] election_list;

    constructor(address _authority_address, string memory _authority_pubkey) {
        authority_address = _authority_address;
        authority_pubkey = _authority_pubkey;
    }

    function get_authority_address() external view returns (address) {
        return authority_address;
    }
    //Utility functions

    function compare_strings(
        string memory some_string,
        string memory another_string
    ) private pure returns (bool) {
        bytes memory some_string_equivalent = bytes(some_string);
        bytes memory another_string_equivalent = bytes(another_string);
        if (some_string_equivalent.length != another_string_equivalent.length) {
            return false;
        }
        for (
            uint counter = 0;
            counter < some_string_equivalent.length;
            counter++
        ) {
            if (
                some_string_equivalent[counter] !=
                another_string_equivalent[counter]
            ) {
                return false;
            }
        }
        return true;
    }

    //EA's Functions
    function enrollVoter(
        string calldata encrypted_full_name,
        address addr,
        string calldata pubkey
    ) external {
        require(msg.sender == authority_address);
        Voter storage new_voter = addressed_voters[addr];
        address_list.push(addr);
        new_voter.encrypted_full_name = encrypted_full_name;
        new_voter.addr = addr;
        new_voter.public_key = pubkey;
    }

    function check_voter_enrolled(
        address some_address
    ) external view returns (bool) {
        return addressed_voters[some_address].addr == some_address;
    }

    function downloadVoterList() external view returns (Voter[] memory) {
        Voter[] memory voter_list = new Voter[](address_list.length);
        for (uint counter = 0; counter < address_list.length; counter++) {
            voter_list[counter] = addressed_voters[address_list[counter]];
        }
        return voter_list;
    }

    function downloadVoterElections(
        address some_address
    ) external view returns (string[] memory) {
        Voter memory selected = addressed_voters[some_address];
        return selected.elections_joined;
    }

    function getElectionList() external view returns (string[] memory) {
        return election_list;
    }

    function createElection(string calldata election_name) external {
        require(msg.sender == authority_address);
        Election storage new_election = all_elections[election_name];
        new_election.election_name = election_name;
        new_election.voter_visible = false;
        new_election.election_over = false;
        election_list.push(election_name);
    }

    function addCandidatetoElection(
        string calldata role,
        string calldata election_name,
        string calldata candidate_name,
        uint candidate_id
    ) external {
        require(msg.sender == authority_address);
        Election storage selected = all_elections[election_name];
        require(!selected.voter_visible);
        selected.candidate_list.push(candidate_id);
        Candidate storage new_candidate = selected.candidate_store[
            candidate_id
        ];
        new_candidate.id = candidate_id;
        new_candidate.name = candidate_name;
        new_candidate.role = role;
    }

    function ChangeCandidateRole(
        uint candidate_id,
        string calldata new_candidate_role,
        string calldata election_name
    ) external {
        require(msg.sender == authority_address);
        Election storage selected = all_elections[election_name];
        require(!selected.voter_visible);
        Candidate storage selected_candidate = selected.candidate_store[
            candidate_id
        ];
        selected_candidate.role = new_candidate_role;
    }

    function ChangeParticipation(
        address voter_address,
        string memory election_name,
        bool participation
    ) external {
        require(msg.sender == authority_address);
        Voter storage selected = addressed_voters[voter_address];

        //Linear search for the election name
        for (
            uint counter = 0;
            counter < selected.elections_joined.length;
            counter++
        ) {
            string memory current_name = selected.elections_joined[counter];
            if (compare_strings(current_name, election_name)) {
                Election storage selected_election = all_elections[
                    current_name
                ];
                require(!selected_election.voter_visible);
                if (!participation) {
                    //Swap the element with the last element and pop
                    selected.elections_joined[counter] = selected
                        .elections_joined[selected.elections_joined.length - 1];
                    selected.elections_joined.pop();
                }
                //Whether the above block was executed or not, it is time to return, becaus either the voter was already a participant, so don't need to do anything
                //Or, the code in the if block removes the voter from the election
                return;
            }
        }
        //For this part to be reached, the voter must not be in the election yet
        if (participation) {
            selected.elections_joined.push(election_name);
        }
    }
    function make_visible(string calldata election_name) external {
        require(msg.sender == authority_address);
        Election storage selected = all_elections[election_name];
        require(!selected.voter_visible);
        selected.voter_visible = true;
    }

    function is_visible(
        string calldata election_name
    ) external view returns (bool) {
        return all_elections[election_name].voter_visible;
    }

    function end_election(string calldata election_name) external {
        require(msg.sender == authority_address);
        Election storage selected = all_elections[election_name];
        selected.election_over = true;
    }

    function is_election_over(
        string calldata some_election
    ) external view returns (bool) {
        return all_elections[some_election].election_over;
    }

    function getCandidates(
        string calldata election_name
    ) external view returns (uint[] memory) {
        Election storage selected = all_elections[election_name];
        return selected.candidate_list;
    }

    function getCandidateData(
        string calldata election_name,
        uint candidate_id
    ) external view returns (Candidate memory) {
        Election storage selected = all_elections[election_name];
        return selected.candidate_store[candidate_id];
    }

    function assign_control_key(
        address owner,
        string calldata encrypted_control_key,
        string calldata election_name
    ) external {
        require(msg.sender == authority_address);
        Election storage selected = all_elections[election_name];
        require(!selected.voter_visible);
        selected.voter_addresses_to_encrypted_control_keys[
            owner
        ] = encrypted_control_key;
    }

    function authorize_control_address(
        string calldata election_name,
        address control_key_address
    ) external {
        require(msg.sender == authority_address);
        Election storage selected = all_elections[election_name];
        require(!selected.voter_visible);
        selected.authorized_control_addresses[control_key_address] = true;
    }

    function set_encrypted_ea_height(
        string calldata election_name,
        address control_key_address,
        string calldata encrypted_height
    ) external {
        require(msg.sender == authority_address);
        Election storage selected_election = all_elections[election_name];
        History storage selected_history = selected_election
            .control_keys_to_histories[control_key_address];
        selected_history.encrypted_ea_height = encrypted_height;
    }

    function set_election_results(
        string calldata election_name,
        uint candidate_id,
        uint tallied_votes
    ) external {
        require(msg.sender == authority_address);
        Election storage selected = all_elections[election_name];
        selected.election_results[candidate_id] = tallied_votes;
    }

    function get_election_result(
        string calldata election_name,
        uint candidate_id
    ) external view returns (uint) {
        Election storage selected = all_elections[election_name];
        return selected.election_results[candidate_id];
    }

    function sign_voter_transaction(
        string calldata election_name,
        address control_address,
        string calldata latest_signature
    ) external {
        require(msg.sender == authority_address);
        Election storage selected = all_elections[election_name];
        selected.control_keys_to_histories[control_address].signatures.push(
            latest_signature
        );
    }

    //Voter Functions
    function retrieve_control_key(
        string calldata election_name,
        address voter_address
    ) external view returns (string memory) {
        Election storage selected = all_elections[election_name];
        return selected.voter_addresses_to_encrypted_control_keys[voter_address];
    }

    function submit_voter_transaction(
        string calldata election_name,
        string calldata latest_transaction
    ) external {
        Election storage selected = all_elections[election_name];
        require(selected.authorized_control_addresses[msg.sender]);
        require(!selected.election_over);
        selected.control_keys_to_histories[msg.sender].transactions.push(
            latest_transaction
        );
    }

    function download_history(
        string calldata election_name
    ) external view returns (History memory) {
        Election storage selected = all_elections[election_name];
        return selected.control_keys_to_histories[msg.sender];
    }

    function download_voter_history(
        string calldata election_name, address voter_address
    ) external view returns (History memory) {
        Election storage selected = all_elections[election_name];
     
        return selected.control_keys_to_histories[voter_address];
    }
    function getHistorySignatureLength(
        string calldata election_name
    ) external view returns (uint) {
        Election storage selected = all_elections[election_name];
        return selected.control_keys_to_histories[msg.sender].signatures.length;
    }

    function getHistoryTransactionLength(
        string calldata election_name
    ) external view returns (uint) {
        Election storage selected = all_elections[election_name];
        return
            selected.control_keys_to_histories[msg.sender].transactions.length;
    }

    function getAuthorityPubkey() external view returns (string memory) {
        return authority_pubkey;
    }
}
