// Utility functions and processStudentLogs function
processStudentLogs = (students) => {
  const studentReports = {};

  students.forEach((student) => {
    if (!studentReports[student.studentId]) {
      studentReports[student.studentId] = {
        studentId: student.studentId,
        loginCount: 0,
        totalTime: 0,
        logs: [],
        observations: [],
      };
    }

    const report = studentReports[student.studentId];

    // Count logins and total time connected
    student.studentLogs.forEach((log) => {
      if (log.connectedAt && log.disconnectedAt) {
        report.loginCount += 1;
        report.totalTime +=
          new Date(log.disconnectedAt) - new Date(log.connectedAt);
        report.logs.push(log);
      }
    });
    if (student.observations.length == 1) return studentReports;
    // Process observations
    student.observations.forEach((obs) => {
      if (obs.title !== "student is attentive") {
        let tempObservation = null;
        if (obs.title == "student is not attentive")
          tempObservation = "student was not attentive";
        if (obs.title == "student is using his phone")
          tempObservation = "student had been using his phone";

        let occurrenceCount = 0;
        let timeDifference = 0;
        for (
          let observationStart = 0;
          observationStart < obs.occurrencesDates.length - 1;
          observationStart++
        ) {
          for (
            let observationEnd = observationStart + 1;
            observationEnd < obs.occurrencesDates.length;
            observationEnd++
          ) {
            timeDifference =
              (new Date(obs.occurrencesDates[observationEnd]) -
                new Date(obs.occurrencesDates[observationStart])) /
              1000;
            // he must be caught in the act for 5 seconds
            if (timeDifference < 5) continue;
            let timeJump =
              (new Date(obs.occurrencesDates[observationEnd]) -
                new Date(obs.occurrencesDates[observationEnd - 1])) /
              1000;
            // ensures there is a linear action
            if (timeJump > 2) {
              observationStart = --observationEnd;
            timeDifference = 0;
              break
            }

            occurrenceCount++;
            observationStart = --observationEnd;
            console.log(timeDifference);
            timeDifference = 0;
            break;
          }
        }
        if (occurrenceCount > 1)
          studentReports[student.studentId].observations.push(
            `${tempObservation} ${occurrenceCount} times`
          );
        if (occurrenceCount == 1)
          studentReports[student.studentId].observations.push(
            `${tempObservation} once`
          );
      }
    });
  });
  return studentReports;
};

// Data generation function
const generateTestData = () => {
  return [
    {
      studentId: "student1",
      studentLogs: [
        {
          connectedAt: new Date("2023-06-01T10:00:00Z"),
          disconnectedAt: new Date("2023-06-01T10:30:00Z"),
        },
        {
          connectedAt: new Date("2023-06-01T11:00:00Z"),
          disconnectedAt: new Date("2023-06-01T11:15:00Z"),
        },
      ],
      observations: [
        {
          title: "student is not attentive",
          occurrencesDates: [
            new Date("2023-06-01T11:05:00.000Z"),
            new Date("2023-06-01T11:05:02.000Z"),
            new Date(   "2023-06-01T11:05:05.000Z"),
            new Date(   "2023-06-01T11:05:07.000Z"),
            new Date(   "2023-06-01T11:05:09.000Z"),
            new Date(   "2023-06-01T11:05:10.000Z"),
          ],
        },
        {
          title: "student is using his phone",
          occurrencesDates: [
            new Date("2023-06-01T11:05:00Z"),
            new Date("2023-06-01T11:05:02Z"),
            new Date("2023-06-01T11:05:03Z"),
            new Date("2023-06-01T11:05:05Z"),
            new Date("2023-06-01T11:05:12Z"),
            new Date("2023-06-01T11:05:14Z"),
            new Date("2023-06-01T11:05:16Z"),
          ],
        },
      ],
    },
  ];
};

// Test function
const testProcessStudentLogs = () => {
  const testData = generateTestData();
  const studentReports = processStudentLogs(testData);
  console.log(studentReports["student1"].observations);
};

// Run the test
testProcessStudentLogs();
