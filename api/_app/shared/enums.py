from enum import Enum


class PaymentStatus(str, Enum):
    NOT_PAID = "NotPaid"
    PAID = "Paid"
    FAILED = "Failed"


class WillType(str, Enum):
    ALL_INDIA = "allindia"
    GOAN = "goan"
    SUCCESSION_DEED = "successiondeed"
    CUSTOM_WILL = "customwill"
