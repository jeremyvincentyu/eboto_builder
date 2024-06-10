from authority import Authority
from single_run import single_run

authority_account = Authority()
all_voters = authority_account.enroll_voters(40)

time_taken = single_run(40,0,all_voters,authority_account)

print(f"This run took {time_taken} seconds.")