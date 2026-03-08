import tkinter as tk
from tkinter import Canvas, Scrollbar

class ERDiagram:
    def __init__(self, root):
        self.root = root
        self.root.title("Gyandeep ER Diagram")
        self.root.geometry("1400x900")
        
        self.canvas = Canvas(root, bg='white', width=1380, height=880)
        self.scroll_x = Scrollbar(root, orient='horizontal', command=self.canvas.xview)
        self.scroll_y = Scrollbar(root, orient='vertical', command=self.canvas.yview)
        
        self.canvas.configure(xscrollcommand=self.scroll_x.set, yscrollcommand=self.scroll_y.set)
        self.canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.scroll_x.pack(side=tk.BOTTOM, fill=tk.X)
        self.scroll_y.pack(side=tk.RIGHT, fill=tk.Y)
        
        self.canvas.bind('<Configure>', lambda e: self.canvas.configure(scrollregion=self.canvas.bbox('all')))
        
        self.entities = self.get_entities()
        self.relationships = self.get_relationships()
        self.draw_diagram()
    
    def get_entities(self):
        return {
            "USERS": ["id PK", "name", "email", "password", "role", "faceImage", 
                      "googleId", "emailVerified", "active", "preferences", 
                      "classId FK", "xp", "coins", "level", "totalQuizzes", 
                      "longestStreak", "createdAt", "updatedAt"],
            "CLASSES": ["id PK", "name", "subjectIds", "createdAt"],
            "SUBJECTS": ["id PK", "name", "teacherId FK", "classId FK", "createdAt"],
            "CLASS_SESSIONS": ["id PK", "code", "expiry", "notes", "quiz", 
                               "quizPublished", "subject", "teacherId FK", 
                               "teacherLocation", "attendanceRadius", "classId FK", "startedAt"],
            "ATTENDANCE": ["id PK", "sessionId FK", "studentId FK", "studentName", 
                           "status", "timestamp", "location", "verified", "createdAt"],
            "QUIZ_QUESTIONS": ["id PK", "sessionId FK", "question", "options", 
                               "correctAnswer", "createdAt"],
            "QUIZ_SUBMISSIONS": ["id PK", "studentId FK", "sessionId FK", "answers", 
                                 "score", "totalQuestions", "submittedAt"],
            "GRADES": ["id PK", "studentId FK", "subject", "score", "maxScore", 
                       "quizId", "teacherId FK", "createdAt", "updatedAt"],
            "PERFORMANCE_DATA": ["id PK", "studentId FK", "subject", "date", 
                                 "score", "createdAt"],
            "USER_HISTORY": ["id PK", "userId FK", "type", "details", "timestamp"],
            "BLOCKCHAIN_RECORDS": ["id PK", "recordType", "recordId", "studentId FK", 
                                   "transactionHash", "blockNumber", "timestamp", 
                                   "verified", "data", "createdAt"],
            "NFT_CERTIFICATES": ["id PK", "tokenId", "studentId FK", "courseId", 
                                 "courseName", "grade", "issueDate", "metadataURI", 
                                 "revoked", "owner", "createdAt"],
            "DIGITAL_TWIN_STATES": ["id PK", "classroomId", "timestamp", "studentsData", 
                                    "teacherData", "activeSession", "createdAt"],
            "ENGAGEMENT_METRICS": ["id PK", "userId FK", "type", "count", 
                                   "timestamp", "createdAt"],
            "ANNOUNCEMENTS": ["id PK", "title", "content", "authorId FK", 
                              "priority", "createdAt", "expiresAt"],
        }
    
    def get_relationships(self):
        return [
            ("USERS", "CLASSES", "enrolled_in", "1:N"),
            ("USERS", "SUBJECTS", "teaches", "1:N"),
            ("USERS", "CLASS_SESSIONS", "hosts", "1:N"),
            ("USERS", "ATTENDANCE", "marks", "1:N"),
            ("USERS", "QUIZ_SUBMISSIONS", "submits", "1:N"),
            ("USERS", "GRADES", "receives", "1:N"),
            ("USERS", "PERFORMANCE_DATA", "has", "1:N"),
            ("USERS", "USER_HISTORY", "generates", "1:N"),
            ("USERS", "BLOCKCHAIN_RECORDS", "owns", "1:N"),
            ("USERS", "NFT_CERTIFICATES", "holds", "1:N"),
            ("USERS", "ENGAGEMENT_METRICS", "tracks", "1:N"),
            ("USERS", "ANNOUNCEMENTS", "authored", "1:N"),
            ("CLASSES", "SUBJECTS", "contains", "1:N"),
            ("CLASSES", "CLASS_SESSIONS", "has", "1:N"),
            ("CLASS_SESSIONS", "ATTENDANCE", "records", "1:N"),
            ("CLASS_SESSIONS", "QUIZ_SUBMISSIONS", "contains", "1:N"),
            ("CLASS_SESSIONS", "QUIZ_QUESTIONS", "has", "1:N"),
        ]
    
    def draw_ellipse(self, x, y, text, pk=False, fk=False):
        width = max(120, len(text) * 7)
        height = 25
        
        if pk:
            self.canvas.create_oval(x, y, x + width, y + height, outline='black', width=2)
            self.canvas.create_text(x + width//2, y + height//2, text=f"_{text}_", font=('Arial', 8, 'underline'))
        elif fk:
            self.canvas.create_oval(x, y, x + width, y + height, outline='blue', width=2, dash=(4, 2))
            self.canvas.create_text(x + width//2, y + height//2, text=text, font=('Arial', 8), fill='blue')
        else:
            self.canvas.create_oval(x, y, x + width, y + height, outline='black', width=1)
            self.canvas.create_text(x + width//2, y + height//2, text=text, font=('Arial', 8))
        
        return x + width // 2, y + height // 2
    
    def draw_rectangle(self, x, y, name, attrs):
        rect_width = 180
        header_height = 30
        attr_height = 22
        rect_height = header_height + len(attrs) * attr_height + 10
        
        self.canvas.create_rectangle(x, y, x + rect_width, y + rect_height, 
                                     outline='black', width=2, fill='#f5f5f5')
        self.canvas.create_rectangle(x, y, x + rect_width, y + header_height, 
                                     outline='black', width=2, fill='#333333')
        self.canvas.create_text(x + rect_width//2, y + header_height//2, 
                                text=name, font=('Arial', 10, 'bold'), fill='white')
        
        attr_centers = []
        for i, attr in enumerate(attrs):
            attr_y = y + header_height + i * attr_height + attr_height // 2
            pk = 'PK' in attr
            fk = 'FK' in attr
            cx, cy = self.draw_ellipse(x + 10, attr_y - 10, attr, pk=pk, fk=fk)
            attr_centers.append((cx, cy))
        
        return x + rect_width // 2, y + rect_height, attr_centers
    
    def draw_diamond(self, x, y, name, cardinality):
        size = 40
        points = [
            x, y + size//2,
            x + size//2, y,
            x + size, y + size//2,
            x + size//2, y + size
        ]
        self.canvas.create_polygon(points, outline='black', fill='#ffffcc', width=1)
        self.canvas.create_text(x + size//2, y + size//2 - 8, text=name, font=('Arial', 7))
        self.canvas.create_text(x + size//2, y + size//2 + 8, text=cardinality, font=('Arial', 7, 'bold'))
        return x + size//2, y + size//2
    
    def draw_line(self, x1, y1, x2, y2):
        self.canvas.create_line(x1, y1, x2, y2, arrow=tk.LAST, fill='black')
    
    def draw_diagram(self):
        positions = {}
        entity_positions = {}
        
        cols = [
            ["USERS", "CLASSES"],
            ["SUBJECTS", "CLASS_SESSIONS"],
            ["ATTENDANCE", "QUIZ_QUESTIONS", "QUIZ_SUBMISSIONS"],
            ["GRADES", "PERFORMANCE_DATA", "USER_HISTORY"],
            ["BLOCKCHAIN_RECORDS", "NFT_CERTIFICATES", "ENGAGEMENT_METRICS", "ANNOUNCEMENTS"],
            ["DIGITAL_TWIN_STATES"]
        ]
        
        start_x, start_y = 50, 50
        col_gap_x, row_gap_y = 250, 320
        
        for col_idx, col in enumerate(cols):
            for row_idx, entity in enumerate(col):
                x = start_x + col_idx * col_gap_x
                y = start_y + row_idx * row_gap_y
                cx, by, _ = self.draw_rectangle(x, y, entity, self.entities[entity])
                positions[entity] = (cx, by)
                entity_positions[entity] = (x, y)
        
        for src, tgt, rel, card in self.relationships:
            if src in positions and tgt in positions:
                x1, y1 = positions[src]
                x2, y2 = positions[tgt]
                
                mid_x = (x1 + x2) // 2
                mid_y = (y1 + y2) // 2
                
                rx, ry = self.draw_diamond(mid_x - 25, mid_y - 25, rel, card)
                
                self.draw_line(x1, y1, rx, ry - 20)
                self.draw_line(rx + 20, ry, x2, y2 - 30)
        
        legend_x, legend_y = 1000, 50
        self.canvas.create_rectangle(legend_x, legend_y, legend_x + 200, legend_y + 200,
                                      outline='black', fill='white', width=2)
        self.canvas.create_text(legend_x + 100, legend_y + 20, text="LEGEND", font=('Arial', 10, 'bold'))
        
        self.canvas.create_rectangle(legend_x + 20, legend_y + 40, legend_x + 60, legend_y + 65,
                                      outline='black', fill='#f5f5f5', width=2)
        self.canvas.create_text(legend_x + 90, legend_y + 52, text="Entity", anchor='w')
        
        self.canvas.create_oval(legend_x + 30, legend_y + 80, legend_x + 50, legend_y + 100,
                                 outline='black')
        self.canvas.create_text(legend_x + 90, legend_y + 90, text="Attribute", anchor='w')
        
        self.canvas.create_oval(legend_x + 30, legend_y + 115, legend_x + 50, legend_y + 135,
                                 outline='black')
        self.canvas.create_text(legend_x + 90, legend_y + 125, text="PK", anchor='w')
        
        self.canvas.create_oval(legend_x + 30, legend_y + 150, legend_x + 50, legend_y + 170,
                                 outline='blue', dash=(4, 2))
        self.canvas.create_text(legend_x + 90, legend_y + 160, text="FK", anchor='w', fill='blue')
        
        points = [legend_x + 30, legend_y + 185, legend_x + 40, legend_y + 180, 
                   legend_x + 50, legend_y + 185, legend_x + 40, legend_y + 195]
        self.canvas.create_polygon(points, fill='#ffffcc', outline='black')
        self.canvas.create_text(legend_x + 90, legend_y + 188, text="Relationship", anchor='w')

if __name__ == "__main__":
    root = tk.Tk()
    app = ERDiagram(root)
    root.mainloop()
