if __name__ == '__main__':
    def bytes2hexstr(b):
        return " ".join(hex(n) for n in b)

    print(f"{bytes2hexstr(b'Bob')} {bytes2hexstr(b'NY')} {hex(42)}")
    print(f"{bytes2hexstr(b'Sarah')} {bytes2hexstr(b'FL')} {hex(39)}")
    print(f"{bytes2hexstr(b'Alice')} {bytes2hexstr(b'CA')} {hex(30)}")
    print(f"{bytes2hexstr(b'Charlie')} {bytes2hexstr(b'TX')} {hex(21)}")

    import sys


    def bytes2hexstr(b):
        return " ".join(hex(n) for n in b)


    # Function to calculate memory size of each component in a record
    def record_memory_size(name, state, age):
        name_size = sys.getsizeof(name)  # Memory size of the name
        state_size = sys.getsizeof(state)  # Memory size of the state
        age_size = sys.getsizeof(age)  # Memory size of the integer age
        total_size = name_size + state_size + age_size
        return total_size, name_size, state_size, age_size



    # Records with their byte representations and memory usage calculation
    records = [
        (b'Bob', b'NY', 42),
        (b'Sarah', b'FL', 39),
        (b'Alice', b'CA', 30),
        (b'Charlie', b'TX', 21)
    ]

    for name, state, age in records:
        total_size, name_size, state_size, age_size = record_memory_size(name, state, age)
        print(f"Record: {bytes2hexstr(name)} {bytes2hexstr(state)} {hex(age)}")
        print(f"Memory Usage (bytes) - Name: {name_size}, State: {state_size}, Age: {age_size}, Total: {total_size}\n")


    def record_raw_data_size(name, state, age):
        name_size = len(name)  # Actual bytes in the name
        state_size = len(state)  # Actual bytes in the state
        age_size = (age.bit_length() + 7) // 8  # Number of bytes needed to store age in raw data
        total_size = name_size + state_size + age_size
        return total_size, name_size, state_size, age_size


    # Test each record with raw data size
    records = [
        (b'Bob', b'NY', 42),
        (b'Sarah', b'FL', 39),
        (b'Alice', b'CA', 30),
        (b'Charlie', b'TX', 21)
    ]
    print(id(records[0]))
    print(id(records[1]))

    for name, state, age in records:
        total_size, name_size, state_size, age_size = record_raw_data_size(name, state, age)
        print(f"Raw Data Size (bytes) - Name: {name_size}, State: {state_size}, Age: {age_size}, Total: {total_size}\n")

    import struct

    # Define a packed struct without padding
    packed_data_no_padding = struct.pack("=c i h", b'A', 1, 2)  # '=': standard alignment, no padding

    # Define the same struct with native padding
    packed_data_with_padding = struct.pack("c i h", b'A', 1, 2)  # '@': native alignment (likely with padding)

    print("Packed data without padding:", packed_data_no_padding)
    print("Packed data with padding:", packed_data_with_padding)

    # Attempt to unpack with standard alignment, ignoring padding^
    unpacked_no_padding = struct.unpack("=c i h", packed_data_no_padding)  # Works correctly
    unpacked_with_padding = struct.unpack("=c i h", packed_data_with_padding)  # Error due to padding mismatch

    print("Unpacked without padding (correct):", unpacked_no_padding)
    print("Unpacked with padding (incorrect):", unpacked_with_padding)  # This will raise an error

