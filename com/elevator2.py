if __name__ == '__main__':
    # Given data
    initial_cylinder = 32000
    requests = [
        {"time": 0, "cylinder": 40000},
        {"time": 10, "cylinder": 20000},
        {"time": 24, "cylinder": 24000},
        {"time": 15, "cylinder": 36000},
        {"time": 21, "cylinder": 16000},
        {"time": 50, "cylinder": 28000}
    ]

    # Disk characteristics
    seek_time_per_4000_cylinders = 1  # ms per 4000 cylinders
    rotational_latency = 4.17  # ms
    transfer_time = 0.13  # ms per block
    head_start_stop_time = 1  # ms total

    # Sort requests in SCAN (Elevator) order
    # Separate requests above and below the initial cylinder
    upward_requests = sorted([r for r in requests if r["cylinder"] >= initial_cylinder], key=lambda x: x["cylinder"])
    downward_requests = sorted([r for r in requests if r["cylinder"] < initial_cylinder], key=lambda x: x["cylinder"], reverse=True)
    sorted_requests = upward_requests + downward_requests  # Move upwards, then reverse direction
    print(upward_requests)
    print(downward_requests)

    # Initialize variables
    current_time = 0  # Initial time including head start/stop
    current_cylinder = initial_cylinder
    arr = []  # Store completion times for each request

    # Calculate completion time for each request in sorted order
    print("Request processing order and times:")
    for req in sorted_requests:
        # Seek time for the movement to the requested cylinder
        cylinders_to_move = abs(req["cylinder"] - current_cylinder)
        seek_time = (cylinders_to_move / 4000) * seek_time_per_4000_cylinders + head_start_stop_time  # ms

        # Total time to service this request
        time_to_complete_request = seek_time + rotational_latency + transfer_time
        current_time += time_to_complete_request  # Update total time so far
        arr.append(current_time)  # Store each completion time

        # Output for each request
        print(f"Cylinder {req['cylinder']} (moved {cylinders_to_move} cylinders): Total time {current_time:.3f} ms")

        # Update current cylinder to the requested cylinder
        current_cylinder = req["cylinder"]

    # Print completion times list
    print("\nCompletion times for each request (in ms):")
    print([round(t, 3) for t in arr])