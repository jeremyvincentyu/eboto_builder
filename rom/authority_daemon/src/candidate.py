import json


class Candidate:
    def __init__(self,id: int,name: str, role: str):
        self.id = id
        self.name = name
        self.role = role
    
    def dump_to_dict(self)->dict[str,str]:
        flattened ={"id": str(self.id), "name": self.name, "role": self.role}
        return flattened

def group_candidates_by_role(list_of_candidates: list[Candidate])->dict[str,list[Candidate]]:
    candidates_by_role: dict[str,list[Candidate]] = {}
    for every_candidate in list_of_candidates:
        if not (every_candidate.role in candidates_by_role):
            candidates_by_role[every_candidate.role] = list()
        candidates_by_role[every_candidate.role].append(every_candidate)
    return candidates_by_role

def read_roles_from_string(json_representation: str)->dict[str,list[Candidate]]:
    candidates_by_role: dict[str,list[Candidate]] = {}
    serialized_object : dict[str,list[dict[str,str]]] = json.loads(json_representation)
    
    for every_role in serialized_object:
        candidates_in_role = serialized_object[every_role]
        
        if not (every_role in candidates_by_role):
            candidates_by_role[every_role] = list()
        
        for flattened_candidate in candidates_in_role:
            id = int(flattened_candidate["id"])
            name = flattened_candidate["name"]
            role = flattened_candidate["role"]
            new_candidate = Candidate(id,name,role)
            candidates_by_role[every_role].append(new_candidate) 

    return candidates_by_role

def dump_roles_to_string(candidates_by_role: dict[str,list[Candidate]])->str:
    serialized_object: dict[str,list[dict[str,str]]] = {}

    for every_role in candidates_by_role:
        candidates_in_role: list[Candidate] = candidates_by_role[every_role]

        if not (every_role in serialized_object):
            serialized_object[every_role] = list()
        
        for every_candidate in candidates_in_role:
            serialized_object[every_role].append(every_candidate.dump_to_dict())
    
    return json.dumps(serialized_object)