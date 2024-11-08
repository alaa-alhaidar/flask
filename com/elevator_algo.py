if __name__ == '__main__':
    # Given data
    initial_cylinder = 32000
    requests = [
        {"time": 0, "cylinder": 40000},
        {"time": 10, "cylinder": 20000},
        {"time": 24, "cylinder": 60000},
        {"time": 15, "cylinder": 12000},
        {"time": 21, "cylinder": 16000},
        {"time": 50, "cylinder": 64000}
    ]

    # Disk characteristics
    seek_time_per_4000_cylinders = 1  # ms per 4000 cylinders
    rotational_latency = 4.17  # ms
    transfer_time = 0.13  # ms per block
    head_start_stop_time = 1  # ms total

    # Order of serving requests as per Elevator (SCAN) algorithm
    # Sorted sequence based on initial upward movement (towards larger cylinders), then reversing
    sorted_requests = [
        {"time": 0, "cylinder": 40000},
        {"time": 1, "cylinder": 60000},
        {"time": 2, "cylinder": 64000},
        {"time": 3, "cylinder": 20000},
        {"time": 5, "cylinder": 16000},
        {"time": 4, "cylinder": 12000}

    ]


    # Print the sorted list
    print(sorted_requests)

    # Initialize variables
    current_time = 0 + head_start_stop_time  # Initial time including head start/stop
    current_cylinder = initial_cylinder
    arr = []

    # Calculate completion time for each request in sorted order
    for req in sorted_requests:
        # Seek time for the movement to the requested cylinder
        cylinders_to_move = abs(req["cylinder"] - current_cylinder)
        print(req["cylinder"],"<-", cylinders_to_move," -/+ ", current_cylinder)
        seek_time = (cylinders_to_move / 4000) * seek_time_per_4000_cylinders +1  # ms


        # Total time to service this request
        time_to_complete_request = (seek_time + rotational_latency + transfer_time)
        arr.append(time_to_complete_request)
        print("Total time: ",sum(arr).__round__(3))

        # Completion time
        completion_time = current_time + time_to_complete_request

        # Update current cylinder and time
        current_cylinder = req["cylinder"]


    print(arr)
