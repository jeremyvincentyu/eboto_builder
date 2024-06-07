from voter import Voter
from authority import Authority
from time import sleep, time

#Single Run Function
def single_run(size: int, trial: int , voter_pool: list[Voter], authority_account: Authority) -> float:
    #Start a single election
    authority_account.create_election(size,trial)
    election_name = f"{size}_voters_trial_{trial}"
    
    #Wait 15 minutes
    sleep(900)

    starting_time = time()
    
    #Have each voter cast a vote
    for every_voter in voter_pool[:size]:
        every_voter.cast_vote(election_name)

    
    #Terminate the election
    authority_account.end_election(election_name)

    ending_time = time()

    return ending_time - starting_time