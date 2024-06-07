from authority import Authority
from voter import Voter
from single_run import single_run

#Binary Search Function
def binary_search(min_size: int, max_size: int, all_results:dict[int,float], voter_pool: list[Voter], authority: Authority)->tuple[int,float]:
    #If the min size and the max size are already the same, just return the previous result 
    if min_size == max_size:
        return min_size, all_results[min_size]
    
    #If the min size and the max size are just 1 unit apart, just linear search through both of them 
    if min_size + 1 == max_size:
        try:
            min_time_taken = all_results[min_size]
        except KeyError:
            min_time_taken = check_size(min_size,voter_pool, authority)
            all_results[min_size] = min_time_taken
        try:
            max_time_taken = all_results[max_size]
        except KeyError:
            max_time_taken = check_size(max_size, voter_pool, authority)
            all_results[max_size] = max_time_taken

        if max_time_taken <= 1800:
            return max_size,max_time_taken
        else:
            return min_size, min_time_taken

    checking_size = int((min_size + max_size)/2)
    new_time = check_size(checking_size, voter_pool, authority)
    
    all_results[checking_size] = new_time
    
    #Branch where the election did not time out
    if new_time <= 1800:
        return binary_search(checking_size,max_size,all_results,voter_pool, authority)
    
    #Branch where election timed out
    else:
        return binary_search(min_size,checking_size,all_results,voter_pool, authority)

#Size inspector function
def check_size(size: int,voter_pool: list[Voter], authority_account: Authority) -> float:
    #Make 5 Trials
    trials = [single_run(size,trial,voter_pool,authority_account) for trial in range(5)]

    #Average the trials
    average = sum(trials)/5
    
    #Print the results to stdout
    print(f"An Election of {size} voters takes on average {average/60} minutes")
    
    #Return the average
    return average


def start_test():
    #Test Flow
    all_results: dict[int, float] = {}
    #Create an authority account
    authority_account = Authority()

    #Use it to enroll 40 voters
    all_voters = authority_account.enroll_voters(40)

    #Start the binary search
    max_size, time_taken = binary_search(0,40, all_results,all_voters, authority_account)
    print(f"Maximum election size that fits within 30 minutes is {max_size}, taking {time_taken} minutes")

start_test()