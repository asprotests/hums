import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer, GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { studentPortalApi, type Transcript } from '@/lib/api/studentPortal';

export function StudentTranscriptPage() {
  const navigate = useNavigate();
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTranscript();
  }, []);

  const loadTranscript = async () => {
    try {
      setLoading(true);
      const response = await studentPortalApi.getTranscript();
      if (response.success && response.data) {
        setTranscript(response.data);
      }
    } catch (err) {
      console.error('Failed to load transcript:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!transcript) return;

    let content = `
HORMUUD UNIVERSITY
UNOFFICIAL TRANSCRIPT
=====================================

Student: ${transcript.student.name}
Student ID: ${transcript.student.studentId}
Email: ${transcript.student.email}
Date of Birth: ${transcript.student.dateOfBirth ? new Date(transcript.student.dateOfBirth).toLocaleDateString() : 'N/A'}
Admission Date: ${new Date(transcript.student.admissionDate).toLocaleDateString()}
Status: ${transcript.student.status}

Program: ${transcript.program.name} (${transcript.program.code})
Department: ${transcript.program.department || 'N/A'}
Faculty: ${transcript.program.faculty || 'N/A'}

=====================================
ACADEMIC RECORD
=====================================
`;

    for (const sem of transcript.academicRecord.semesters) {
      content += `\n${sem.name}\n${'-'.repeat(60)}\n`;
      content += `${'Code'.padEnd(10)} ${'Course Name'.padEnd(30)} ${'Cr'.padEnd(4)} ${'Score'.padEnd(7)} ${'Grade'.padEnd(6)} Points\n`;
      content += `${'-'.repeat(60)}\n`;

      for (const course of sem.courses) {
        content += `${course.courseCode.padEnd(10)} ${course.courseName.substring(0, 29).padEnd(30)} ${course.credits.toString().padEnd(4)} ${course.finalScore.toFixed(1).padEnd(7)} ${course.letterGrade.padEnd(6)} ${(course.gradePoints * course.credits).toFixed(1)}\n`;
      }

      content += `${'-'.repeat(60)}\n`;
      content += `Semester Credits: ${sem.semesterCredits} | Semester GPA: ${sem.semesterGPA.toFixed(2)}\n`;
    }

    content += `
=====================================
CUMULATIVE SUMMARY
=====================================
Total Credits Earned: ${transcript.academicRecord.totalCredits}
Cumulative GPA: ${transcript.academicRecord.cumulativeGPA.toFixed(2)}

=====================================
${transcript.disclaimer}

Generated: ${new Date(transcript.generatedAt).toLocaleString()}
=====================================
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${transcript.student.studentId.replace(/\//g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!transcript) {
    return (
      <div className="text-center py-12">
        <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No transcript data available</p>
        <Button className="mt-4" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Hidden when printing */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Academic Transcript</h1>
            <p className="text-muted-foreground">Unofficial transcript</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      {/* Transcript Card */}
      <Card className="transcript-card max-w-4xl mx-auto">
        <CardContent className="p-8 print:p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">HORMUUD UNIVERSITY</h2>
            <p className="text-muted-foreground">Mogadishu, Somalia</p>
            <h3 className="text-xl font-semibold mt-4">UNOFFICIAL TRANSCRIPT</h3>
          </div>

          <Separator className="my-4" />

          {/* Student Information */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="font-semibold mb-2">Student Information</h4>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Name:</span> {transcript.student.name}</p>
                <p><span className="text-muted-foreground">Student ID:</span> {transcript.student.studentId}</p>
                <p><span className="text-muted-foreground">Email:</span> {transcript.student.email}</p>
                <p><span className="text-muted-foreground">Status:</span> {transcript.student.status}</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Program Information</h4>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Program:</span> {transcript.program.name}</p>
                <p><span className="text-muted-foreground">Code:</span> {transcript.program.code}</p>
                <p><span className="text-muted-foreground">Department:</span> {transcript.program.department || 'N/A'}</p>
                <p><span className="text-muted-foreground">Faculty:</span> {transcript.program.faculty || 'N/A'}</p>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Academic Record */}
          <div>
            <h4 className="font-semibold mb-4">Academic Record</h4>

            {transcript.academicRecord.semesters.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No completed courses</p>
            ) : (
              <div className="space-y-6">
                {transcript.academicRecord.semesters.map((semester, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <h5 className="font-semibold mb-3">{semester.name}</h5>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Code</th>
                          <th className="text-left py-2">Course Name</th>
                          <th className="text-center py-2">Credits</th>
                          <th className="text-center py-2">Score</th>
                          <th className="text-center py-2">Grade</th>
                          <th className="text-center py-2">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {semester.courses.map((course, cIdx) => (
                          <tr key={cIdx} className="border-b last:border-0">
                            <td className="py-2 font-mono">{course.courseCode}</td>
                            <td className="py-2">{course.courseName}</td>
                            <td className="py-2 text-center">{course.credits}</td>
                            <td className="py-2 text-center">{course.finalScore.toFixed(1)}</td>
                            <td className="py-2 text-center font-semibold">{course.letterGrade}</td>
                            <td className="py-2 text-center">{(course.gradePoints * course.credits).toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex justify-between mt-3 pt-3 border-t text-sm">
                      <span>Semester Credits: <strong>{semester.semesterCredits}</strong></span>
                      <span>Semester GPA: <strong>{semester.semesterGPA.toFixed(2)}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator className="my-6" />

          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Credits Earned</p>
                <p className="text-2xl font-bold">{transcript.academicRecord.totalCredits}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Cumulative GPA</p>
                <p className="text-3xl font-bold">{transcript.academicRecord.cumulativeGPA.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Disclaimer */}
          <div className="text-center text-sm text-muted-foreground">
            <p className="italic">{transcript.disclaimer}</p>
            <p className="mt-2">Generated on: {new Date(transcript.generatedAt).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }

          body * {
            visibility: hidden;
          }

          .transcript-card,
          .transcript-card * {
            visibility: visible;
          }

          .transcript-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none !important;
            border: none !important;
          }

          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
