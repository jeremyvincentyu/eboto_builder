from abc import ABC, abstractmethod

class ProtoList(ABC):
    @abstractmethod
    def late_phase_imminent(self, checking_name: str)->bool:
        pass