from time import time
#Binary Search Function
def binary_search(min_size: int, max_size: int, previous_result: float)->tuple[int,float]:
    #If the min size and the max size are already the same, just return the previous result 
    if min_size == max_size:
        return min_size,previous_result
    
    #If the min size and the max size are just 1 unit apart, just linear search through both of them 
    if min_size + 1 == max_size:
        min_time_taken = check_size(min_size)
        max_time_taken = check_size(max_size)
        if max_time_taken <= 1800:
            return max_size,max_time_taken
        else:
            return min_size, min_time_taken

    checking_size = int((min_size + max_size)/2)
    new_time = check_size(checking_size)

    #Branch where the election did not time out
    if new_time> 1800:
        return binary_search(min_size,checking_size,previous_result)
    #Branch where election timed out
    else:
        return binary_search(checking_size,max_size,new_time)

#Size inspector function
def check_size(size: int) -> float:
    #Make 3 Trials
    trials = [single_run(size) for _ in range(3)]

    #Average the trials
    average = sum(trials)/3
    
    #Print the results to stdout
    print(f"An Election of {size} voters takes on average {average/60} minutes")
    #Return the average
    return average

#Single Run Function
def single_run(size: int, voter_pool: list[str]) -> float:
    return 0
#Setup Function

#Test Flow